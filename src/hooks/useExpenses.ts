import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export type DateRange = 'today' | 'this_week' | 'this_month' | 'all'

function getDateRange(range: DateRange): { from?: string; to?: string } {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (range === 'today') {
    const t = fmt(today)
    return { from: t, to: t }
  }
  if (range === 'this_week') {
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(today)
    mon.setDate(today.getDate() + diff)
    return { from: fmt(mon), to: fmt(today) }
  }
  if (range === 'this_month') {
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) }
  }
  return {}
}

export function useExpenses(range: DateRange = 'this_month') {
  const { session } = useAuth()
  const [data, setData] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    const { from, to } = getDateRange(range)
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (from) query = query.gte('expense_date', from)
    if (to) query = query.lte('expense_date', to)

    const { data: rows } = await query
    setData((rows ?? []) as Expense[])
    setLoading(false)
  }, [session?.user?.id, range])

  useEffect(() => { fetch() }, [fetch])

  const total = data.reduce((sum, e) => sum + Number(e.amount), 0)

  return { data, loading, total, refetch: fetch }
}
