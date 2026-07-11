declare module 'ffprobe-static' {
  /** Caminho absoluto para o binário ffprobe empacotado. */
  export const path: string
  const ffprobeStatic: { path: string }
  export default ffprobeStatic
}
