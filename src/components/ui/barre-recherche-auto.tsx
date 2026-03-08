'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  placeholder?: string
  defaultValue?: string
  baseUrl:       string
}

export function BarreRechercheAuto({ placeholder, defaultValue = '', baseUrl }: Props) {
  const router = useRouter()
  const [valeur, setValeur] = useState(defaultValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function naviguer(q: string) {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    const str = qs.toString()
    router.replace(`${baseUrl}${str ? `?${str}` : ''}`)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValeur(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length >= 3 || v.length === 0) {
      debounceRef.current = setTimeout(() => naviguer(v), 300)
    }
  }

  return (
    <div className="flex max-w-sm gap-2">
      <Input
        value={valeur}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      {valeur && (
        <Button variant="ghost" onClick={() => { setValeur(''); naviguer('') }}>✕</Button>
      )}
    </div>
  )
}
