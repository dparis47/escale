'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function BoutonFinaliserAccompagnement({ id }: { id: number }) {
  const [loading, setLoading] = useState(false)
  const router  = useRouter()

  async function finaliser() {
    setLoading(true)
    try {
      await fetch(`/api/accompagnement/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ estBrouillon: false }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={finaliser}
      disabled={loading}
      className="bg-orange-600 hover:bg-orange-700 text-white"
    >
      {loading ? 'Finalisation…' : 'Finaliser l\'accompagnement'}
    </Button>
  )
}
