import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ImageIcon, Package, Wrench } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploader } from '@/components/ImageUploader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'
import { usePartCategories } from '@/hooks/usePartCategories'

const schema = yup.object({
  name: yup.string().required(),
  description: yup.string(),
  category: yup.string().required(),
  condition: yup.string().oneOf(['new', 'used', 'refurbished']).required(),
  price: yup.number().positive().required(),
  quantity: yup.number().integer().min(0).required(),
  compatible_makes: yup.string(),
  compatible_models: yup.string(),
  year_from: yup.number().integer().min(1980),
  year_to: yup.number().integer().min(1980),
  part_number: yup.string(),
})

const textareaClass =
  'min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:ring-offset-slate-900 dark:placeholder:text-slate-500'

function getYearBounds(part) {
  const minYear = part?.minCompatibleYear ?? part?.min_compatible_year
  const maxYear = part?.maxCompatibleYear ?? part?.max_compatible_year
  if (Number.isFinite(Number(minYear)) || Number.isFinite(Number(maxYear))) {
    return {
      yearFrom: Number.isFinite(Number(minYear)) ? Number(minYear) : 2010,
      yearTo: Number.isFinite(Number(maxYear)) ? Number(maxYear) : new Date().getFullYear(),
    }
  }

  const range = part?.compatibleYears ?? part?.compatible_years
  if (typeof range === 'string') {
    const m = range.match(/^\[(\d+),(\d+)\)$/)
    if (m) {
      return {
        yearFrom: Number(m[1]),
        yearTo: Math.max(Number(m[2]) - 1, Number(m[1])),
      }
    }
  }
  return { yearFrom: 2010, yearTo: new Date().getFullYear() }
}

export function PartFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [images, setImages] = useState([])
  const categoriesQ = usePartCategories()

  const existingQ = useQuery({
    queryKey: ['dealer', 'part', id],
    queryFn: () => apiJson(`/parts/${id}`),
    enabled: isEdit,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      condition: 'new',
      price: 0,
      quantity: 1,
      compatible_makes: '',
      compatible_models: '',
      year_from: 2010,
      year_to: new Date().getFullYear(),
      part_number: '',
    },
  })

  const watchedCategory = watch('category')
  const categoryOptions = useMemo(() => {
    const list = Array.isArray(categoriesQ.data) ? [...categoriesQ.data] : []
    if (watchedCategory && !list.includes(watchedCategory)) {
      return [watchedCategory, ...list]
    }
    return list
  }, [categoriesQ.data, watchedCategory])

  useEffect(() => {
    const p = existingQ.data
    if (!p) return
    const { yearFrom, yearTo } = getYearBounds(p)
    reset({
      name: p.name || '',
      description: p.description || '',
      category: p.category || '',
      condition: p.condition || 'new',
      price: Number(p.price) || 0,
      quantity: p.quantity ?? 1,
      compatible_makes: (p.compatibleMakes ?? p.compatible_makes ?? []).join(', '),
      compatible_models: (p.compatibleModels ?? p.compatible_models ?? []).join(', '),
      year_from: yearFrom,
      year_to: yearTo,
      part_number: p.partNumber ?? p.part_number ?? '',
    })
    // Sync gallery when loading an existing listing (server is source of truth).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local upload state from query
    setImages(p.images || [])
  }, [existingQ.data, reset])

  const saveM = useMutation({
    mutationFn: (body) =>
      isEdit
        ? apiJson(`/dealers/me/parts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
        : apiJson('/dealers/me/parts', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success(isEdit ? 'Part updated' : 'Part created')
      qc.invalidateQueries({ queryKey: ['dealer', 'me', 'parts'] })
      navigate('/dealer/parts')
    },
    onError: (e) => {
      const code = e?.payload?.error?.code
      if (code === 'DEALER_NOT_APPROVED') {
        toast.error('Only approved dealers can publish parts. Complete or review your dealer application.')
        navigate('/dealer/register')
        return
      }
      toast.error(e.message)
    },
  })

  if (isEdit && existingQ.isLoading) return <LoadingSpinner />

  const onSubmit = (vals) => {
    const makes = vals.compatible_makes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const models = vals.compatible_models
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    saveM.mutate({
      name: vals.name,
      description: vals.description,
      category: vals.category,
      condition: vals.condition,
      price: vals.price,
      quantity: vals.quantity,
      compatibleMakes: makes,
      compatibleModels: models,
      minCompatibleYear: vals.year_from ? Number(vals.year_from) : undefined,
      maxCompatibleYear: vals.year_to ? Number(vals.year_to) : undefined,
      images,
      partNumber: vals.part_number || undefined,
    })
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl space-y-8 pb-2">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Listings</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{isEdit ? 'Edit part' : 'New part'}</h1>
        <p className="text-slate-600 dark:text-slate-400">Describe the part, set pricing, and upload photos buyers can trust.</p>
      </div>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
              <Package className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-lg">Listing</CardTitle>
              <CardDescription>All fields sync to your dealer inventory and search.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
              <div className="min-w-0 space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Wrench className="h-4 w-4 text-brand-600" aria-hidden />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Basics</h2>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input {...register('name')} />
                    {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <textarea className={cn(textareaClass, 'resize-y min-h-[100px]')} rows={3} {...register('description')} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={categoriesQ.isLoading}
                        {...register('category')}
                      >
                        <option value="">
                          {categoriesQ.isLoading ? 'Loading categories…' : 'Select a category'}
                        </option>
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {errors.category ? <p className="text-sm text-red-600">{errors.category.message}</p> : null}
                      {categoriesQ.isError ? (
                        <p className="text-sm text-amber-700">Could not load categories. Refresh or check the API.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                        {...register('condition')}
                      >
                        <option value="new">New</option>
                        <option value="used">Used</option>
                        <option value="refurbished">Refurbished</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">Pricing &amp; stock</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Price (GHS)</Label>
                      <Input type="number" step="0.01" {...register('price')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" {...register('quantity')} />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-700">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Compatibility</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Compatible makes (comma-separated)</Label>
                    <Input {...register('compatible_makes')} placeholder="Toyota, Honda" />
                  </div>
                  <div className="space-y-2">
                    <Label>Compatible models</Label>
                    <Input {...register('compatible_models')} placeholder="Corolla, Civic" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Year from</Label>
                      <Input type="number" {...register('year_from')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Year to</Label>
                      <Input type="number" {...register('year_to')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Part number (optional)</Label>
                    <Input {...register('part_number')} />
                  </div>
                  <Button type="submit" disabled={saveM.isPending} className="shadow-md shadow-brand-500/15">
                    Save
                  </Button>
                </section>
              </div>

              <aside className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-800/90 dark:to-slate-900 lg:sticky lg:top-24 lg:max-h-[min(640px,calc(100dvh-7rem))] lg:overflow-y-auto">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                    <ImageIcon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Photos</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Up to 5 images. Shown here while you edit details.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                  <ImageUploader value={images} onChange={setImages} />
                </div>
              </aside>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
