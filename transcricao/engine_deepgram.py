"""Engine de transcrição usando Deepgram Nova-2.

Requer:
  pip install httpx
  API key do Deepgram (https://deepgram.com)
"""

import time
from pathlib import Path

import httpx

MIME_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".wma": "audio/x-ms-wma",
}


class DeepgramEngine:
    API_URL = "https://api.deepgram.com/v1/listen"

    def __init__(
        self,
        api_key: str,
        model: str = "nova-2",
        diarization: bool = True,
        num_speakers: int | None = None,
    ):
        if not api_key:
            raise ValueError(
                "Deepgram API key obrigatoria. Use --deepgram-key ou DEEPGRAM_API_KEY"
            )

        self.api_key = api_key
        self.model = model
        self.diarization = diarization
        self.num_speakers = num_speakers

        print(f"\nDeepgram {model}")
        print(f"Diarizacao: {'Sim' if diarization else 'Nao'}")

    def _build_params(self) -> dict:
        params = {
            "model": self.model,
            "language": "pt-BR",
            "smart_format": "true",
            "punctuate": "true",
            "utterances": "true",
        }
        if self.diarization:
            params["diarize"] = "true"
        return params

    def _normalize_response(self, data: dict) -> dict:
        segmentos = []
        diarizacao_detectada = False

        utterances = data.get("results", {}).get("utterances", [])

        for utt in utterances:
            speaker_id = utt.get("speaker")
            seg = {
                "start": round(utt["start"], 2),
                "end": round(utt["end"], 2),
                "text": utt["transcript"],
            }
            if speaker_id is not None:
                seg["speaker"] = f"SPEAKER_{speaker_id:02d}"
                diarizacao_detectada = True
            segmentos.append(seg)

        return {
            "segments": segmentos,
            "idioma": "pt",
            "diarizacao": diarizacao_detectada,
        }

    def transcrever(self, caminho_audio: Path) -> dict:
        print(f"\n{'='*60}")
        print(f"Transcrevendo: {caminho_audio.name}")
        print(f"Tamanho: {caminho_audio.stat().st_size / (1024*1024):.1f} MB")
        print(f"Engine: Deepgram {self.model}")
        print(f"{'='*60}")

        ext = caminho_audio.suffix.lower()
        content_type = MIME_TYPES.get(ext, "audio/wav")

        params = self._build_params()
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": content_type,
        }

        print("  [1/2] Enviando audio para Deepgram...")
        inicio = time.time()

        with open(caminho_audio, "rb") as f:
            audio_data = f.read()

        response = httpx.post(
            self.API_URL,
            params=params,
            headers=headers,
            content=audio_data,
            timeout=600,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Deepgram erro {response.status_code}: {response.text[:500]}"
            )

        data = response.json()
        tempo_api = time.time() - inicio
        duration = data.get("metadata", {}).get("duration", 0)
        print(f"         Concluido em {tempo_api:.1f}s (audio: {duration/60:.1f} min)")

        print("  [2/2] Normalizando resultado...")
        resultado = self._normalize_response(data)

        n_speakers = len(set(
            s.get("speaker", "") for s in resultado["segments"] if s.get("speaker")
        ))
        if n_speakers:
            print(f"         Speakers detectados: {n_speakers}")
        print(f"         Segmentos: {len(resultado['segments'])}")

        return resultado
