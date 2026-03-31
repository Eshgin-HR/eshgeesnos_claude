import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, GTDContext, AreaTag, TaskStatus } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface TaskFilter {
  area?: AreaTag | 'all'
  context?: GTDContext | 'all'
  status?: TaskStatus | 'all'
  stalledOnly?: boolean
}

export function useTasks(filter?: TaskFilter) {
  const { session } = useAuth()
  const [data, setData] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    let query = supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (filter?.area && filter.area !== 'all') {
      query = query.eq('area_tag', filter.area)
    }
    if (filter?.context && filter.context !== 'all') {
      query = query.eq('context_tag', filter.context)
    }
    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status)
    } else if (!filter?.status) {
      // Default: exclude done/deferred
      query = query.in('status', ['open', 'in_progress'])
    }

    const { data: rows, error: err } = await query
    if (err) {
      setError(new Error(`[tasks] fetch failed: ${err.message}`))
    } else {
      let result = (rows ?? []) as Task[]
      if (filter?.stalledOnly) {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        result = result.filter(t => t.activated_at && new Date(t.activated_at).getTime() < cutoff)
      }
      setData(result)
    }
    setLoading(false)
  }, [session?.user?.id, filter?.area, filter?.context, filter?.status, filter?.stalledOnly])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useAllTasks() {
  const { session } = useAuth()
  const [data, setData] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    const { data: rows } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setData((rows ?? []) as Task[])
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}
