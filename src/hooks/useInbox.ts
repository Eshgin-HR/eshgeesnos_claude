import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { InboxItem } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useInbox() {
  const { session } = useAuth()
  const [data, setData] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    const { data: rows, error: err } = await supabase
      .from('inbox')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('processed', false)
      .order('created_at', { ascending: false })
    if (err) {
      setError(new Error(`[inbox] fetch failed: ${err.message}`))
    } else {
      setData((rows ?? []) as InboxItem[])
    }
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, count: data.length, refetch: fetch }
}
