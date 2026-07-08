import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { storage } from "@/lib/firebase/client"

const ICON_SIZE = 128

/** Center-crops the image to a square and downsizes it so uploaded icons stay small. */
function resizeToSquarePng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2

      const canvas = document.createElement("canvas")
      canvas.width = ICON_SIZE
      canvas.height = ICON_SIZE
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem"))
        return
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, ICON_SIZE, ICON_SIZE)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem"))),
        "image/png"
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Não foi possível ler a imagem"))
    }
    img.src = url
  })
}

export type IconFolder = "accounts" | "cards" | "categories"

/** Resizes the given image client-side and uploads it, returning its public download URL. */
export async function uploadEntityIcon(
  uid: string,
  folder: IconFolder,
  file: File
): Promise<string> {
  const blob = await resizeToSquarePng(file)
  const path = `users/${uid}/icons/${folder}/${crypto.randomUUID()}.png`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: "image/png" })
  return getDownloadURL(storageRef)
}
