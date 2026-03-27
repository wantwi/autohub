import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const HISTORY_KEY = 'autohub_search_history_v1'
const MAX_HISTORY = 5

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function pushHistory(entry) {
  const prev = readHistory().filter((x) => x !== entry)
  const next = [entry, ...prev].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

export function SearchBar({
  initialQ = '',
  initialMake = '',
  initialModel = '',
  initialYear = '',
  onSearch,
  className,
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState(initialQ)
  const [make, setMake] = useState(initialMake)
  const [model, setModel] = useState(initialModel)
  const [year, setYear] = useState(initialYear)

  const submit = () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (make.trim()) params.set('make', make.trim())
    if (model.trim()) params.set('model', model.trim())
    if (year.trim()) params.set('year', year.trim())
    const qs = params.toString()
    if (q.trim()) pushHistory(q.trim())
    if (onSearch) {
      onSearch({ q, make, model, year })
      return
    }
    navigate(qs ? `/search?${qs}` : '/search')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className={cn('', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Part name e.g. alternator"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="Make e.g. Toyota"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Input
            placeholder="Model e.g. Corolla"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Input
            placeholder="Year e.g. 2015"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button type="button" onClick={submit} className="shrink-0" size="lg">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
    </div>
  )
}
