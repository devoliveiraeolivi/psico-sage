"""
PsicoSage - Modulo de Transcricao de Sessoes

Suporta quatro engines:
  whisper  - WhisperX local (gratuito, requer GPU para performance)
  google   - Google Cloud STT v2 Chirp 3 (pago, escalavel, sem GPU)
  deepgram - Deepgram Nova-2 ($0.0043/min batch, $200 creditos gratis)
  groq     - Groq Cloud Whisper ($0.04/h turbo, ultra-rapido, sem diarizacao)

Uso:
  # WhisperX (local)
  python transcrever.py <arquivo> --engine whisper --formato json
  python transcrever.py <pasta> --engine whisper --hf-token TOKEN --speakers 2

  # Google Cloud STT (cloud)
  python transcrever.py <arquivo> --engine google --formato json --speakers 2
  python transcrever.py <arquivo> --engine google --batch-mode dynamic  # barato, ate 24h

  # Deepgram Nova-2 (cloud, simples e rapido)
  python transcrever.py <arquivo> --engine deepgram --formato json --speakers 2

  # Groq Cloud (ultra-rapido, sem diarizacao)
  python transcrever.py <arquivo> --engine groq --formato json

Instalar dependencias:
  pip install -r requirements.txt            # WhisperX
  pip install -r requirements-google.txt     # Google Cloud
  pip install -r requirements-deepgram.txt   # Deepgram
  pip install -r requirements-groq.txt       # Groq
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

EXTENSOES_AUDIO = {".m4a", ".mp3", ".wav", ".flac", ".ogg", ".webm", ".mp4"}
PASTA_SAIDA_PADRAO = "transcricoes"


# --- Formatação de saída (compartilhada entre engines) ---

def salvar_resultado(
    resultado: dict, caminho_audio: Path, pasta_saida: Path, formato: str,
    engine_name: str = "",
) -> Path:
    """Salva o resultado da transcrição no formato escolhido.

    O nome do arquivo inclui o engine para evitar sobrescrever resultados
    de engines diferentes: ex. A.J._deepgram.json, A.J._groq.json
    """
    segmentos = resultado["segments"]
    diarizacao = resultado["diarizacao"]
    pasta_saida.mkdir(parents=True, exist_ok=True)
    nome_base = caminho_audio.stem
    sufixo = f"_{engine_name}" if engine_name else ""

    if formato == "txt":
        arquivo_saida = pasta_saida / f"{nome_base}{sufixo}.txt"
        arquivo_saida.write_text(
            _gerar_txt(segmentos, com_speaker=diarizacao), encoding="utf-8"
        )
    elif formato == "srt":
        arquivo_saida = pasta_saida / f"{nome_base}{sufixo}.srt"
        arquivo_saida.write_text(
            _gerar_srt(segmentos, com_speaker=diarizacao), encoding="utf-8"
        )
    elif formato == "json":
        arquivo_saida = pasta_saida / f"{nome_base}{sufixo}.json"
        dados = {
            "arquivo": caminho_audio.name,
            "engine": engine_name,
            "idioma": resultado.get("idioma", "pt"),
            "diarizacao": diarizacao,
            "segmentos": [
                {
                    "inicio": round(s["start"], 2),
                    "fim": round(s["end"], 2),
                    "texto": s["text"].strip(),
                    **({"speaker": s["speaker"]} if "speaker" in s else {}),
                }
                for s in segmentos
            ],
        }
        arquivo_saida.write_text(
            json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    else:
        print(f"Formato desconhecido: {formato}, usando txt")
        arquivo_saida = pasta_saida / f"{nome_base}{sufixo}.txt"
        arquivo_saida.write_text(
            _gerar_txt(segmentos, com_speaker=diarizacao), encoding="utf-8"
        )

    print(f"         Salvo em: {arquivo_saida}")
    return arquivo_saida


def _gerar_txt(segmentos: list, com_speaker: bool) -> str:
    """Gera texto corrido, agrupando falas consecutivas do mesmo speaker."""
    if not com_speaker:
        return " ".join(s["text"].strip() for s in segmentos)

    linhas = []
    speaker_atual = None
    fala_atual = []

    for seg in segmentos:
        speaker = seg.get("speaker", "???")
        texto = seg["text"].strip()
        if not texto:
            continue

        if speaker != speaker_atual:
            if fala_atual:
                linhas.append(f"[{speaker_atual}]: {' '.join(fala_atual)}")
            speaker_atual = speaker
            fala_atual = [texto]
        else:
            fala_atual.append(texto)

    if fala_atual:
        linhas.append(f"[{speaker_atual}]: {' '.join(fala_atual)}")

    return "\n\n".join(linhas)


def _formatar_tempo_srt(segundos: float) -> str:
    h = int(segundos // 3600)
    m = int((segundos % 3600) // 60)
    s = int(segundos % 60)
    ms = int((segundos % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _gerar_srt(segmentos: list, com_speaker: bool) -> str:
    linhas = []
    for i, seg in enumerate(segmentos, 1):
        speaker = seg.get("speaker", "")
        prefixo = f"[{speaker}] " if com_speaker and speaker else ""
        linhas.append(str(i))
        linhas.append(
            f"{_formatar_tempo_srt(seg['start'])} --> {_formatar_tempo_srt(seg['end'])}"
        )
        linhas.append(f"{prefixo}{seg['text'].strip()}")
        linhas.append("")
    return "\n".join(linhas)


def listar_audios(caminho: Path) -> list[Path]:
    """Lista todos os arquivos de áudio em uma pasta."""
    return sorted(
        f
        for f in caminho.iterdir()
        if f.is_file() and f.suffix.lower() in EXTENSOES_AUDIO
    )


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(
        description="Transcreve audios de sessoes terapeuticas (WhisperX, Google Cloud ou Deepgram)"
    )
    parser.add_argument(
        "entrada",
        help="Arquivo de áudio ou pasta contendo áudios",
    )
    parser.add_argument(
        "--engine",
        default="whisper",
        choices=["whisper", "google", "deepgram", "groq"],
        help="Engine de transcricao (padrao: whisper)",
    )
    parser.add_argument(
        "--formato",
        default="txt",
        choices=["txt", "srt", "json"],
        help="Formato de saída (padrão: txt)",
    )
    parser.add_argument(
        "--saida",
        default=None,
        help=f"Pasta de saída (padrão: {PASTA_SAIDA_PADRAO}/ ao lado do áudio)",
    )
    parser.add_argument(
        "--speakers",
        type=int,
        default=None,
        help="Número exato de speakers (padrão: detectar automaticamente)",
    )

    # Whisper-specific
    whisper_group = parser.add_argument_group("WhisperX (engine whisper)")
    whisper_group.add_argument(
        "--modelo",
        default="turbo",
        choices=["tiny", "base", "small", "medium", "large-v3", "turbo"],
        help="Modelo Whisper (padrão: turbo)",
    )
    whisper_group.add_argument(
        "--hf-token",
        default=os.environ.get("HF_TOKEN"),
        help="Token do Hugging Face para diarização (ou HF_TOKEN no ambiente)",
    )

    # Google-specific
    google_group = parser.add_argument_group("Google Cloud STT (engine google)")
    google_group.add_argument(
        "--gcp-project",
        default=os.environ.get("GOOGLE_CLOUD_PROJECT"),
        help="ID do projeto GCP (ou GOOGLE_CLOUD_PROJECT no ambiente)",
    )
    google_group.add_argument(
        "--gcs-bucket",
        default=os.environ.get("GCS_BUCKET"),
        help="Bucket GCS para upload temporário (ou GCS_BUCKET no ambiente)",
    )
    google_group.add_argument(
        "--gcp-region",
        default=os.environ.get("GCP_REGION", "us-central1"),
        help="Região GCP (padrão: us-central1)",
    )
    google_group.add_argument(
        "--batch-mode",
        default="standard",
        choices=["standard", "dynamic"],
        help="standard ($0.016/min, minutos) ou dynamic ($0.004/min, até 24h)",
    )
    google_group.add_argument(
        "--no-diarization",
        action="store_true",
        help="Desativar diarização no Google STT",
    )

    # Deepgram-specific
    dg_group = parser.add_argument_group("Deepgram (engine deepgram)")
    dg_group.add_argument(
        "--deepgram-key",
        default=os.environ.get("DEEPGRAM_API_KEY"),
        help="API key do Deepgram (ou DEEPGRAM_API_KEY no ambiente)",
    )
    dg_group.add_argument(
        "--deepgram-model",
        default="nova-2",
        help="Modelo Deepgram (padrao: nova-2)",
    )

    # Groq-specific
    groq_group = parser.add_argument_group("Groq Cloud (engine groq)")
    groq_group.add_argument(
        "--groq-key",
        default=os.environ.get("GROQ_API_KEY"),
        help="API key do Groq (ou GROQ_API_KEY no ambiente)",
    )
    groq_group.add_argument(
        "--groq-model",
        default="whisper-large-v3-turbo",
        choices=["whisper-large-v3", "whisper-large-v3-turbo"],
        help="Modelo Groq (padrao: whisper-large-v3-turbo)",
    )

    args = parser.parse_args()
    entrada = Path(args.entrada)

    if not entrada.exists():
        print(f"Erro: '{entrada}' não encontrado")
        sys.exit(1)

    # Listar arquivos
    if entrada.is_file():
        arquivos = [entrada]
    elif entrada.is_dir():
        arquivos = listar_audios(entrada)
        if not arquivos:
            print(f"Nenhum arquivo de áudio encontrado em '{entrada}'")
            print(f"Extensões suportadas: {', '.join(sorted(EXTENSOES_AUDIO))}")
            sys.exit(1)
        print(f"Encontrados {len(arquivos)} arquivo(s) de áudio:")
        for a in arquivos:
            print(f"  - {a.name} ({a.stat().st_size / (1024*1024):.1f} MB)")
    else:
        print(f"Erro: '{entrada}' não é um arquivo ou pasta válida")
        sys.exit(1)

    pasta_saida = Path(args.saida) if args.saida else entrada.parent / PASTA_SAIDA_PADRAO

    # Criar engine (lazy imports para não exigir ambas dependências)
    if args.engine == "whisper":
        from engine_whisper import WhisperEngine

        engine = WhisperEngine(
            modelo=args.modelo,
            hf_token=args.hf_token,
            num_speakers=args.speakers,
        )
    elif args.engine == "google":
        from engine_google import GoogleEngine

        engine = GoogleEngine(
            project_id=args.gcp_project,
            region=args.gcp_region,
            bucket_name=args.gcs_bucket,
            batch_mode=args.batch_mode,
            diarization=not args.no_diarization,
            num_speakers=args.speakers,
        )
    elif args.engine == "deepgram":
        from engine_deepgram import DeepgramEngine

        engine = DeepgramEngine(
            api_key=args.deepgram_key,
            model=args.deepgram_model,
            diarization=not args.no_diarization,
            num_speakers=args.speakers,
        )
    elif args.engine == "groq":
        from engine_groq import GroqEngine

        engine = GroqEngine(
            api_key=args.groq_key,
            model=args.groq_model,
        )

    # Transcrever
    inicio_total = time.time()
    resultados = []
    for arquivo in arquivos:
        resultado = engine.transcrever(arquivo)
        saida = salvar_resultado(resultado, arquivo, pasta_saida, args.formato, engine_name=args.engine)
        resultados.append(saida)

    duracao_total = time.time() - inicio_total
    print(f"\n{'='*60}")
    print(f"Transcrição concluída! ({duracao_total:.1f}s)")
    print(f"Engine: {args.engine}")
    print(f"Arquivos processados: {len(resultados)}")
    print(f"Saída em: {pasta_saida}/")
    for r in resultados:
        print(f"  - {r.name}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
