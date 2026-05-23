"use client"

import { useState, useRef } from "react"
import Icon from "@modules/common/components/icon"
import { sdk } from "@lib/config"

type AvatarUploadProps = {
  currentUrl?: string | null
  initial: string
}

export default function AvatarUpload({ currentUrl, initial }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("files", file)

    try {
      // sdk-exempt: SDK client does not support multipart/form-data uploads cleanly
      const res = await fetch(`${backendUrl}/store/customers/me/avatar`, { // sdk-exempt
        method: "POST",
        credentials: "include",
        headers: {
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.avatar_url)
      }
    } catch {}
    setUploading(false)
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      await sdk.client.fetch("/store/customers/me/avatar", { method: "DELETE" })
      setAvatarUrl(null)
    } catch {}
    setUploading(false)
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-outline-variant hover:border-primary transition-colors group"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary-container flex items-center justify-center">
            <span className="text-xl font-bold text-on-primary-container">{initial}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Icon name="photo_camera" size={20} className="text-white" />
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-body-sm text-primary font-medium hover:underline text-left"
        >
          {uploading ? "Uploading..." : avatarUrl ? "Change photo" : "Upload photo"}
        </button>
        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="text-body-sm text-on-surface-variant hover:text-error transition-colors text-left"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
