import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LocationPicker({ lat, lng, onChange, locationText, onLocationText }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="loc-text">Shop address / landmark</Label>
        <Input
          id="loc-text"
          value={locationText || ''}
          onChange={(e) => onLocationText?.(e.target.value)}
          placeholder="e.g. Abossey Okai, Shop 23B"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lat">Latitude</Label>
        <Input
          id="lat"
          inputMode="decimal"
          value={lat ?? ''}
          onChange={(e) => onChange?.({ lat: e.target.value, lng })}
          placeholder="5.6037"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lng">Longitude</Label>
        <Input
          id="lng"
          inputMode="decimal"
          value={lng ?? ''}
          onChange={(e) => onChange?.({ lat, lng: e.target.value })}
          placeholder="-0.1870"
        />
      </div>
      {lat && lng ? (
        <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
          Preview:{' '}
          <a
            className="text-slate-900 underline dark:text-slate-200"
            href={`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        </p>
      ) : null}
    </div>
  )
}
