"""Engine de transcrição na nuvem usando Google Cloud Speech-to-Text v2 (Chirp 3).

Requer:
  pip install google-cloud-speech google-cloud-storage
  Service account com permissões: Speech-to-Text User + Storage Object Admin
  Bucket GCS para upload temporário dos áudios
"""

import re
import time
import uuid
from pathlib import Path

from google.api_core.client_options import ClientOptions
from google.cloud import storage
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech


class GoogleEngine:
    STANDARD_TIMEOUT = 600    # 10 min para batch standard
    DYNAMIC_TIMEOUT = 86400   # 24h para dynamic batch

    def __init__(
        self,
        project_id: str,
        region: str = "us-central1",
        bucket_name: str | None = None,
        batch_mode: str = "standard",
        diarization: bool = True,
        num_speakers: int | None = None,
    ):
        if not project_id:
            raise ValueError(
                "GCP project ID obrigatório. Use --gcp-project ou GOOGLE_CLOUD_PROJECT"
            )
        if not bucket_name:
            raise ValueError(
                "Bucket GCS obrigatório. Use --gcs-bucket ou GCS_BUCKET"
            )

        self.project_id = project_id
        self.region = region
        self.bucket_name = bucket_name
        self.batch_mode = batch_mode
        self.diarization = diarization
        self.num_speakers = num_speakers

        # Chirp 3 só está disponível em "us" e "eu" (não em regiões específicas)
        api_region = region if region in ("us", "eu", "global") else "us"
        self.api_region = api_region

        self.speech_client = SpeechClient(
            client_options=ClientOptions(
                api_endpoint=f"{api_region}-speech.googleapis.com",
            )
        )
        self.storage_client = storage.Client(project=project_id)
        self.bucket = self.storage_client.bucket(bucket_name)

        modo = "dinâmico ($0.004/min)" if batch_mode == "dynamic" else "standard ($0.016/min)"
        print(f"\nGoogle Cloud STT v2 (Chirp 3)")
        print(f"Projeto: {project_id} | Região: {region}")
        print(f"Bucket: {bucket_name} | Modo: {modo}")
        print(f"Diarização: {'Sim' if diarization else 'Não'}")

    def _get_duration(self, caminho_audio: Path) -> float:
        """Retorna duração do áudio em segundos via ffprobe."""
        import subprocess
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet", "-show_entries",
                "format=duration", "-of", "csv=p=0", str(caminho_audio),
            ],
            capture_output=True, text=True, check=True,
        )
        return float(result.stdout.strip())

    def _converter_para_wav(self, caminho_audio: Path) -> Path | None:
        """Converte áudio para WAV 16kHz mono (formato ideal para STT) se necessário."""
        formatos_nativos = {".wav", ".flac"}
        if caminho_audio.suffix.lower() in formatos_nativos:
            return None  # não precisa converter

        import subprocess
        import tempfile

        wav_path = Path(tempfile.mktemp(suffix=".wav"))
        print(f"         Convertendo {caminho_audio.suffix} -> WAV 16kHz mono...")
        subprocess.run(
            [
                "ffmpeg", "-i", str(caminho_audio),
                "-ar", "16000", "-ac", "1", "-f", "wav",
                str(wav_path), "-y",
            ],
            capture_output=True,
            check=True,
        )
        return wav_path

    def _split_audio(self, caminho_audio: Path, max_minutes: int = 18) -> list[tuple[Path, float]]:
        """Divide áudio em pedaços de max_minutes. Retorna [(path, offset_seconds), ...]."""
        import subprocess
        import tempfile

        duration = self._get_duration(caminho_audio)
        max_seconds = max_minutes * 60

        if duration <= max_seconds:
            return [(caminho_audio, 0.0)]

        n_chunks = int(duration // max_seconds) + (1 if duration % max_seconds > 0 else 0)
        print(f"         Audio tem {duration/60:.1f} min (limite: {max_minutes} min/chunk)")
        print(f"         Dividindo em {n_chunks} partes...")

        chunks = []
        for i in range(n_chunks):
            start = i * max_seconds
            chunk_path = Path(tempfile.mktemp(suffix=f"_part{i:02d}.wav"))
            subprocess.run(
                [
                    "ffmpeg", "-i", str(caminho_audio),
                    "-ss", str(start), "-t", str(max_seconds),
                    "-ar", "16000", "-ac", "1", "-f", "wav",
                    str(chunk_path), "-y",
                ],
                capture_output=True, check=True,
            )
            chunks.append((chunk_path, start))

        return chunks

    def _upload_to_gcs(self, caminho_audio: Path, job_id: str | None = None) -> str:
        job_id = job_id or uuid.uuid4().hex[:12]
        gcs_path = f"psicosage-temp/{job_id}/{caminho_audio.name}"
        blob = self.bucket.blob(gcs_path)
        blob.upload_from_filename(str(caminho_audio))
        return f"gs://{self.bucket_name}/{gcs_path}"

    def _delete_from_gcs(self, gcs_uri: str):
        path = gcs_uri.replace(f"gs://{self.bucket_name}/", "")
        blob = self.bucket.blob(path)
        try:
            blob.delete()
            print("         Arquivo temporário removido do GCS")
        except Exception as e:
            print(f"         Aviso: não foi possível remover {gcs_uri}: {e}")

    def _build_config(self) -> cloud_speech.RecognitionConfig:
        features = cloud_speech.RecognitionFeatures(
            enable_word_time_offsets=True,
        )

        if self.diarization:
            diarization_config = cloud_speech.SpeakerDiarizationConfig()
            if self.num_speakers:
                diarization_config.min_speaker_count = self.num_speakers
                diarization_config.max_speaker_count = self.num_speakers
            features.diarization_config = diarization_config

        return cloud_speech.RecognitionConfig(
            auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
            language_codes=["pt-BR"],
            model="chirp_3",
            features=features,
        )

    def _batch_recognize(self, gcs_uri: str) -> cloud_speech.BatchRecognizeResponse:
        config = self._build_config()
        file_metadata = cloud_speech.BatchRecognizeFileMetadata(uri=gcs_uri)

        request = cloud_speech.BatchRecognizeRequest(
            recognizer=f"projects/{self.project_id}/locations/{self.api_region}/recognizers/_",
            config=config,
            files=[file_metadata],
            recognition_output_config=cloud_speech.RecognitionOutputConfig(
                inline_response_config=cloud_speech.InlineOutputConfig(),
            ),
        )

        if self.batch_mode == "dynamic":
            request.processing_strategy = (
                cloud_speech.BatchRecognizeRequest.ProcessingStrategy.DYNAMIC_BATCHING
            )

        modo_label = "dinâmico (pode demorar até 24h)" if self.batch_mode == "dynamic" else "standard"
        print(f"  [2/4] Enviando para Google STT (Chirp 3, {modo_label})...")
        inicio = time.time()

        operation = self.speech_client.batch_recognize(request=request)
        timeout = self.DYNAMIC_TIMEOUT if self.batch_mode == "dynamic" else self.STANDARD_TIMEOUT
        response = operation.result(timeout=timeout)

        print(f"         Transcrição concluída em {time.time() - inicio:.1f}s")
        return response, gcs_uri

    def _normalize_speaker(self, label: str) -> str:
        """Normaliza labels de speaker para formato SPEAKER_00."""
        if not label:
            return ""
        # Se já está no formato SPEAKER_XX, retorna como está
        if label.startswith("SPEAKER_"):
            return label
        # Extrai número e formata
        nums = re.findall(r"\d+", label)
        if nums:
            return f"SPEAKER_{int(nums[0]):02d}"
        return f"SPEAKER_{label}"

    def _normalize_response(
        self, response: cloud_speech.BatchRecognizeResponse, gcs_uri: str
    ) -> dict:
        print("  [3/4] Normalizando resultado...")

        matched_key = None
        for key in response.results:
            if gcs_uri in key or key in gcs_uri:
                matched_key = key
                break
        if not matched_key and response.results:
            matched_key = list(response.results.keys())[0]

        if not matched_key:
            print("         AVISO: Nenhum resultado encontrado na resposta!")
            return {"segments": [], "idioma": "pt", "diarizacao": False}

        file_result = response.results[matched_key]
        if file_result.error and file_result.error.code:
            print(f"         ERRO do Google: {file_result.error}")
            return {"segments": [], "idioma": "pt", "diarizacao": False}

        transcript_result = file_result.transcript

        segmentos = []
        diarizacao_detectada = False

        for result in transcript_result.results:
            if not result.alternatives:
                continue

            alt = result.alternatives[0]

            if alt.words:
                current_speaker = None
                current_words = []
                current_start = None
                current_end = None

                for word_info in alt.words:
                    speaker = self._normalize_speaker(
                        getattr(word_info, "speaker_label", "") or ""
                    )
                    if speaker:
                        diarizacao_detectada = True

                    # Se mudou de speaker, salva o segmento atual
                    if speaker != current_speaker and current_words:
                        segmentos.append({
                            "start": current_start,
                            "end": current_end,
                            "text": " ".join(current_words),
                            **({"speaker": current_speaker} if current_speaker else {}),
                        })
                        current_words = []
                        current_start = None

                    if current_start is None:
                        current_start = word_info.start_offset.total_seconds()
                    current_end = word_info.end_offset.total_seconds()
                    current_words.append(word_info.word)
                    current_speaker = speaker

                if current_words:
                    segmentos.append({
                        "start": current_start,
                        "end": current_end,
                        "text": " ".join(current_words),
                        **({"speaker": current_speaker} if current_speaker else {}),
                    })
            else:
                # Sem word-level timestamps — usa result-level
                end_time = result.result_end_offset.total_seconds()
                segmentos.append({
                    "start": max(0, end_time - 30),
                    "end": end_time,
                    "text": alt.transcript.strip(),
                })

        return {
            "segments": segmentos,
            "idioma": "pt",
            "diarizacao": diarizacao_detectada,
        }

    def _transcribe_single(self, gcs_uri: str) -> dict:
        """Transcreve um único arquivo já no GCS."""
        try:
            response, gcs_uri = self._batch_recognize(gcs_uri)
        except Exception as e:
            if self.diarization and "diarization" in str(e).lower():
                print(f"         Aviso: diarização falhou. Retentando sem diarização...")
                self.diarization = False
                response, gcs_uri = self._batch_recognize(gcs_uri)
            else:
                raise
        return self._normalize_response(response, gcs_uri)

    def transcrever(self, caminho_audio: Path) -> dict:
        print(f"\n{'='*60}")
        print(f"Transcrevendo: {caminho_audio.name}")
        print(f"Tamanho: {caminho_audio.stat().st_size / (1024*1024):.1f} MB")
        print(f"Engine: Google Cloud STT v2 (Chirp 3)")
        print(f"{'='*60}")

        # Converter para WAV se necessário
        arquivo_convertido = self._converter_para_wav(caminho_audio)
        wav_file = arquivo_convertido or caminho_audio

        # Dividir em chunks se > 18 min (limite Google: 20 min)
        chunks = self._split_audio(wav_file)
        is_chunked = len(chunks) > 1

        job_id = uuid.uuid4().hex[:12]
        gcs_uris = []
        temp_files = []
        all_segments = []
        diarizacao = False

        try:
            # Upload de todos os chunks
            print(f"  [1/4] Fazendo upload para GCS{f' ({len(chunks)} partes)' if is_chunked else ''}...")
            inicio_upload = time.time()
            for chunk_path, _ in chunks:
                uri = self._upload_to_gcs(chunk_path, job_id)
                gcs_uris.append(uri)
                if chunk_path != wav_file and chunk_path != caminho_audio:
                    temp_files.append(chunk_path)
            print(f"         Upload concluido em {time.time() - inicio_upload:.1f}s")

            # Transcrever cada chunk
            for i, ((chunk_path, offset), gcs_uri) in enumerate(zip(chunks, gcs_uris)):
                if is_chunked:
                    print(f"\n  --- Parte {i+1}/{len(chunks)} (offset: {offset/60:.1f} min) ---")

                resultado = self._transcribe_single(gcs_uri)

                if resultado["diarizacao"]:
                    diarizacao = True

                # Ajustar timestamps com o offset do chunk
                for seg in resultado["segments"]:
                    seg["start"] = round(seg["start"] + offset, 2)
                    seg["end"] = round(seg["end"] + offset, 2)
                    all_segments.append(seg)

            n_speakers = len(set(
                s.get("speaker", "") for s in all_segments if s.get("speaker")
            ))
            if n_speakers:
                print(f"\n         Speakers detectados: {n_speakers}")
            print(f"         Segmentos totais: {len(all_segments)}")

        finally:
            print(f"  [4/4] Limpando arquivos temporarios...")
            for uri in gcs_uris:
                self._delete_from_gcs(uri)
            for tmp in temp_files:
                if tmp.exists():
                    tmp.unlink()
            if arquivo_convertido and arquivo_convertido.exists():
                arquivo_convertido.unlink()
                print("         Arquivos temporarios locais removidos")

        return {
            "segments": all_segments,
            "idioma": "pt",
            "diarizacao": diarizacao,
        }
