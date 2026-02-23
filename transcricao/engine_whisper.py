"""Engine de transcrição local usando WhisperX + pyannote."""

import time
from pathlib import Path

import torch
import whisperx


class WhisperEngine:
    def __init__(
        self,
        modelo: str = "turbo",
        device: str | None = None,
        compute_type: str | None = None,
        hf_token: str | None = None,
        num_speakers: int | None = None,
    ):
        self.hf_token = hf_token
        self.num_speakers = num_speakers

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = device

        if compute_type is None:
            compute_type = "float16" if device == "cuda" else "int8"

        print(f"\nDevice: {device} | Compute: {compute_type}")
        print(f"Carregando modelo WhisperX '{modelo}'...")
        inicio = time.time()
        self.modelo = whisperx.load_model(modelo, device, compute_type=compute_type)
        print(f"Modelo carregado em {time.time() - inicio:.1f}s")

        if not hf_token:
            print("Aviso: sem HF_TOKEN, diarização desativada.")

    def transcrever(self, caminho_audio: Path) -> dict:
        """Transcreve um arquivo, retorna formato normalizado."""
        audio_path = str(caminho_audio)

        # 1) Transcrever
        print("  [1/4] Transcrevendo áudio...")
        inicio = time.time()
        resultado = self.modelo.transcribe(audio_path, language="pt", batch_size=16)
        print(f"         Concluído em {time.time() - inicio:.1f}s")

        # 2) Alinhar timestamps por palavra
        print("  [2/4] Alinhando timestamps...")
        inicio = time.time()
        modelo_alinhamento, metadata = whisperx.load_align_model(
            language_code="pt", device=self.device
        )
        resultado = whisperx.align(
            resultado["segments"],
            modelo_alinhamento,
            metadata,
            audio_path,
            self.device,
            return_char_alignments=False,
        )
        print(f"         Concluído em {time.time() - inicio:.1f}s")

        # 3) Diarização (identificar quem fala)
        diarizacao = False
        if self.hf_token:
            print("  [3/4] Identificando speakers...")
            inicio = time.time()
            diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=self.hf_token, device=self.device
            )
            diarize_kwargs = {}
            if self.num_speakers:
                diarize_kwargs["min_speakers"] = self.num_speakers
                diarize_kwargs["max_speakers"] = self.num_speakers
            diarize_segments = diarize_model(audio_path, **diarize_kwargs)
            resultado = whisperx.assign_word_speakers(diarize_segments, resultado)
            diarizacao = True

            speakers = set()
            for seg in resultado["segments"]:
                if "speaker" in seg:
                    speakers.add(seg["speaker"])
            print(f"         Concluído em {time.time() - inicio:.1f}s")
            print(f"         Speakers detectados: {len(speakers)} ({', '.join(sorted(speakers))})")
        else:
            print("  [3/4] Diarização pulada (sem HF_TOKEN)")

        print("  [4/4] Normalizando resultado...")

        # Normalizar para formato comum
        segmentos = [
            {
                "start": s["start"],
                "end": s["end"],
                "text": s["text"].strip(),
                **({"speaker": s["speaker"]} if "speaker" in s else {}),
            }
            for s in resultado["segments"]
        ]

        return {
            "segments": segmentos,
            "idioma": "pt",
            "diarizacao": diarizacao,
        }
