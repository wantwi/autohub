import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { ImagePlus, Package, Search, Store, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ImageUploader } from '@/components/ImageUploader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { usePartCategories } from '@/hooks/usePartCategories'

const CONDITIONS = ['new', 'used', 'refurbished']

export function AdminDealerPartsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('details')
  const categoriesQ = usePartCategories()
  const categoryList = Array.isArray(categoriesQ.data) ? categoriesQ.data : []

  const dealersQ = useQuery({
    queryKey: ['admin', 'dealers', 'approved-for-upload'],
    queryFn: () => apiJson('/dealers/admin/list?status=approved&page=1&pageSize=200'),
  })

  const { control, register, handleSubmit, setValue, reset } = useForm({
    defaultValues: {
      dealerId: '',
      name: '',
      description: '',
      category: '',
      condition: 'new',
      price: '',
      quantity: 1,
      compatibleMakes: '',
      compatibleModels: '',
      minCompatibleYear: '',
      maxCompatibleYear: '',
      partNumber: '',
      images: [],
    },
  })

  const createM = useMutation({
    mutationFn: async (vals) => {
      const payload = {
        name: vals.name,
        description: vals.description || undefined,
        category: vals.category,
        condition: vals.condition,
        price: Number(vals.price),
        quantity: Number(vals.quantity || 1),
        compatibleMakes: vals.compatibleMakes ? vals.compatibleMakes.split(',').map((s) => s.trim()).filter(Boolean) : [],
        compatibleModels: vals.compatibleModels ? vals.compatibleModels.split(',').map((s) => s.trim()).filter(Boolean) : [],
        minCompatibleYear: vals.minCompatibleYear ? Number(vals.minCompatibleYear) : undefined,
        maxCompatibleYear: vals.maxCompatibleYear ? Number(vals.maxCompatibleYear) : undefined,
        partNumber: vals.partNumber || undefined,
        images: vals.images || [],
      }
      return apiJson(`/admin/dealers/${vals.dealerId}/parts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success('Listing uploaded for dealer')
      qc.invalidateQueries({ queryKey: ['dealer', 'parts'] })
      reset({ dealerId: '', condition: 'new', quantity: 1, images: [] })
      setTab('details')
    },
    onError: (e) => toast.error(e.message || 'Upload failed'),
  })

  const dealers = useMemo(() => (Array.isArray(dealersQ.data) ? dealersQ.data : []), [dealersQ.data])
  const images = useWatch({ control, name: 'images' }) || []
  const selectedDealerId = useWatch({ control, name: 'dealerId' })
  const selectedDealer = useMemo(
    () => dealers.find((d) => d.id === selectedDealerId),
    [dealers, selectedDealerId],
  )

  const [dealerSearch, setDealerSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)

  const filteredDealers = useMemo(() => {
    if (!dealerSearch.trim()) return dealers
    const q = dealerSearch.toLowerCase()
    return dealers.filter(
      (d) =>
        d.shopName?.toLowerCase().includes(q) ||
        d.userFullName?.toLowerCase().includes(q) ||
        d.userPhone?.includes(q),
    )
  }, [dealers, dealerSearch])

  const selectDealer = (d) => {
    setValue('dealerId', d.id, { shouldDirty: true })
    setDealerSearch('')
    setShowDropdown(false)
  }

  const clearDealer = () => {
    setValue('dealerId', '', { shouldDirty: true })
    setDealerSearch('')
  }

  if (dealersQ.isLoading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in-up space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">AutoHub Ghana · Admin</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Upload listing for dealer</h1>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Create parts on behalf of any approved dealer. Add details first, then attach images before publishing.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Store className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
          <span className="text-slate-500 dark:text-slate-400">Approved dealers</span>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{dealers.length}</span>
        </div>
      </header>

      <form onSubmit={handleSubmit((vals) => createM.mutate(vals))}>
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50/90 to-white px-4 py-5 sm:px-6 dark:border-slate-700 dark:from-slate-900/90 dark:to-slate-900">
            <div className="w-full max-w-sm space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search dealer
              </Label>
              {selectedDealer ? (
                <div className="flex h-10 items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50/80 px-3 dark:border-brand-500/30 dark:bg-brand-500/15">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    {selectedDealer.shopName?.charAt(0)?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDealer.shopName}
                  </span>
                  <button
                    type="button"
                    onClick={clearDealer}
                    className="rounded p-0.5 text-slate-400 hover:bg-brand-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-brand-500/20 dark:hover:text-slate-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={searchRef}>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    value={dealerSearch}
                    onChange={(e) => {
                      setDealerSearch(e.target.value)
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    placeholder="Type to search dealers..."
                    className="h-10 pl-9"
                  />
                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-900">
                      {filteredDealers.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">No dealers found</p>
                      ) : (
                        filteredDealers.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectDealer(d)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-white">
                              {d.shopName?.charAt(0)?.toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{d.shopName}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{d.userFullName || d.userPhone || '—'}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-b border-slate-100 px-4 pt-4 sm:px-6 dark:border-slate-700">
            <Tabs>
              <TabsList className="w-full justify-start rounded-xl bg-slate-100/90 p-1 sm:w-auto dark:bg-slate-800">
                <TabsTrigger active={tab === 'details'} onClick={() => setTab('details')}>
                  <Package className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  Part details
                </TabsTrigger>
                <TabsTrigger active={tab === 'images'} onClick={() => setTab('images')}>
                  <ImagePlus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  Images
                  {images.length > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white shadow-sm">
                      {images.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <TabsContent active={tab === 'details'}>
            <div className="grid lg:grid-cols-[1fr_320px] lg:divide-x lg:divide-slate-100 dark:lg:divide-slate-700">
              {/* Left — Part info */}
              <div className="space-y-4 p-4 sm:p-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Part name</Label>
                  <Input
                    {...register('name', { required: true })}
                    placeholder="e.g. Toyota Corolla Front Bumper 2018"
                    className="h-10 rounded-lg border-slate-200 shadow-sm dark:border-slate-700"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Category</Label>
                    <select
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:focus-visible:ring-slate-100/10"
                      disabled={categoriesQ.isLoading}
                      {...register('category', { required: true })}
                    >
                      <option value="">
                        {categoriesQ.isLoading ? 'Loading categories…' : 'Select a category'}
                      </option>
                      {categoryList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {categoriesQ.isError ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400">Could not load categories.</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Condition</Label>
                    <select
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:focus-visible:ring-slate-100/10"
                      {...register('condition')}
                    >
                      {CONDITIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Price (GHS)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('price', { required: true })}
                      className="h-10 rounded-lg border-slate-200 shadow-sm dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Quantity</Label>
                    <Input type="number" min="0" {...register('quantity')} className="h-10 rounded-lg border-slate-200 shadow-sm dark:border-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Part number</Label>
                    <Input {...register('partNumber')} placeholder="OEM / SKU" className="h-10 rounded-lg border-slate-200 shadow-sm dark:border-slate-700" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                  <textarea
                    {...register('description')}
                    placeholder="Fitment notes, condition details, any extra info for the buyer..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:ring-slate-100/10"
                  />
                </div>
              </div>

              {/* Right — Compatibility */}
              <div className="border-t border-slate-100 p-4 sm:p-6 lg:border-t-0 dark:border-slate-700">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Compatibility</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Makes</Label>
                    <textarea
                      {...register('compatibleMakes')}
                      placeholder="Toyota, Honda, Nissan, Hyundai..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:ring-slate-100/10"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Separate with commas</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Models</Label>
                    <textarea
                      {...register('compatibleModels')}
                      placeholder="Corolla, Civic, Camry, Elantra..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:ring-slate-100/10"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Separate with commas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Year from</Label>
                      <Input
                        type="number"
                        {...register('minCompatibleYear')}
                        placeholder="2016"
                        className="h-10 rounded-lg border-slate-200 shadow-sm dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Year to</Label>
                      <Input
                        type="number"
                        {...register('maxCompatibleYear')}
                        placeholder="2022"
                        className="h-10 rounded-lg border-slate-200 shadow-sm dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent active={tab === 'images'}>
            <div className="p-4 sm:p-6">
              <div className="mx-auto max-w-md">
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                  <ImageUploader value={images} onChange={(next) => setValue('images', next, { shouldDirty: true })} />
                </div>
                <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  First image becomes the listing cover photo. You can switch to Part details anytime.
                </p>
              </div>
            </div>
          </TabsContent>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-xs text-slate-600 sm:max-w-md dark:text-slate-400">
              {selectedDealer ? (
                <>
                  Listing will appear in <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDealer.shopName}</span>{' '}
                  inventory once uploaded.
                </>
              ) : (
                'Select a dealer to enable upload.'
              )}
            </p>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              disabled={createM.isPending || !selectedDealerId}
              className="w-full gap-2 rounded-xl shadow-md sm:w-auto sm:min-w-[11rem]"
            >
              <Upload className="h-4 w-4" />
              {createM.isPending ? 'Uploading...' : 'Upload listing'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
