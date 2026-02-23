"""Engine de transcrição usando Groq Cloud (Whisper em LPU).

Requer:
  pip install httpx
  API key do Groq (https://console.groq.com)

Nota: Groq nao suporta diarizacao nativa. Use deepgram se precisar identificar speakers.
"""

import time
from pathlib import Path

import httpx

API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

# Limite de 25 MB no free tier
MAX_FILE_SIZE_MB = 25


class GroqEngine:
    def __init__(
        self,
        api_key: str,
        model: str = "whisper-large-v3-turbo",
    ):
        if not api_key:
            raise ValueError(
                "Groq API key obrigatoria. Use --groq-key ou GROQ_API_KEY"
            )

        self.api_key = api_key
        self.model = model

        print(f"\nGroq Cloud ({model})")
        print("Diarizacao: Nao (Whisper nao suporta)")

    def _normalize_response(self, data: dict) -> dict:
        segmentos = []

        for seg in data.get("segments", []):
            segmentos.append({
                "start": round(seg["start"], 2),
                "end": round(seg["end"], 2),
                "text": seg["text"],
            })

        return {
            "segments": segmentos,
            "idioma": "pt",
            "diarizacao": False,
        }

    def transcrever(self, caminho_audio: Path) -> dict:
        tamanho_mb = caminho_audio.stat().st_size / (1024 * 1024)

        print(f"\n{'='*60}")
        print(f"Transcrevendo: {caminho_audio.name}")
        print(f"Tamanho: {tamanho_mb:.1f} MB")
        print(f"Engine: Groq {self.model}")
        print(f"{'='*60}")

        if tamanho_mb > MAX_FILE_SIZE_MB:
            raise RuntimeError(
                f"Arquivo muito grande ({tamanho_mb:.1f} MB). "
                f"Groq aceita ate {MAX_FILE_SIZE_MB} MB."
            )

        print("  [1/2] Enviando audio para Groq...")
        inicio = time.time()

        with open(caminho_audio, "rb") as f:
            response = httpx.post(
                API_URL,
                headers={"Authorization": f"Bearer {self.api_key}"},
                files={"file": (caminho_audio.name, f)},
                data={
                    "model": self.model,
                    "language": "pt",
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "segment",
                },
                timeout=600,
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"Groq erro {response.status_code}: {response.text[:500]}"
            )

        data = response.json()
        tempo_api = time.time() - inicio
        duration = data.get("duration", 0)
        print(f"         Concluido em {tempo_api:.1f}s (audio: {duration/60:.1f} min)")

        print("  [2/2] Normalizando resultado...")
        resultado = self._normalize_response(data)
        print(f"         Segmentos: {len(resultado['segments'])}")

        return resultado
