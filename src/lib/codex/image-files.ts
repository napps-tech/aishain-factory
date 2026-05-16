import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const generatedDir = join(process.cwd(), 'public', 'generated')

export const publishGeneratedImage = (
  result: string,
  sourcePath?: string | null,
): string | undefined => {
  mkdirSync(generatedDir, { recursive: true })

  if (sourcePath && existsSync(sourcePath)) {
    const extension = extname(sourcePath).replace('.', '') || 'png'
    const output = createImagePath(extension)
    copyFileSync(sourcePath, output.absolutePath)
    return output.url
  }

  const decoded = decodeBase64Image(result)
  if (!decoded) return undefined

  const output = createImagePath(decoded.extension)
  writeFileSync(output.absolutePath, decoded.buffer)
  return output.url
}

const decodeBase64Image = (
  result: string,
): { buffer: Buffer; extension: string } | undefined => {
  const dataUrlMatch = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(result)
  if (dataUrlMatch) {
    return {
      buffer: Buffer.from(dataUrlMatch[2], 'base64'),
      extension: dataUrlMatch[1] === 'jpeg' ? 'jpg' : dataUrlMatch[1],
    }
  }

  if (
    result.startsWith('data:') ||
    result.startsWith('http://') ||
    result.startsWith('https://') ||
    result.startsWith('/')
  ) {
    return undefined
  }

  return {
    buffer: Buffer.from(result, 'base64'),
    extension: 'png',
  }
}

const createImagePath = (extension: string): { absolutePath: string; url: string } => {
  const filename = `screen-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.${extension}`

  return {
    absolutePath: join(generatedDir, filename),
    url: `/public/generated/${filename}`,
  }
}
