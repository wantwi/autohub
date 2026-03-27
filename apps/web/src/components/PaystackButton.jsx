import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getEnv } from '@/lib/env'

function loadPaystackScript() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.PaystackPop) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://js.paystack.co/v1/inline.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Paystack'))
    document.body.appendChild(s)
  })
}

/**
 * @param {{
 *   email: string,
 *   amountPesewas: number,
 *   reference: string,
 *   metadata?: Record<string, unknown>,
 *   onSuccess?: (ref: string) => void,
 *   onClose?: () => void,
 *   label?: string,
 * }} props
 */
export function PaystackButton({
  email,
  amountPesewas,
  reference,
  metadata,
  onSuccess,
  onClose,
  label = 'Pay with Paystack',
}) {
  const [loading, setLoading] = useState(false)
  const pk = getEnv().paystackPublicKey

  const pay = useCallback(async () => {
    if (!pk) {
      alert('Paystack public key missing (VITE_PAYSTACK_PUBLIC_KEY).')
      return
    }
    setLoading(true)
    try {
      await loadPaystackScript()
      const handler = window.PaystackPop.setup({
        key: pk,
        email,
        amount: amountPesewas,
        ref: reference,
        metadata: metadata || {},
        callback: () => {
          onSuccess?.(reference)
        },
        onClose: () => {
          onClose?.()
        },
      })
      handler.openIframe()
    } catch (e) {
      console.error(e)
      alert(e.message || 'Payment failed to start')
    } finally {
      setLoading(false)
    }
  }, [amountPesewas, email, metadata, onClose, onSuccess, pk, reference])

  return (
    <Button type="button" onClick={pay} disabled={loading || !email || !amountPesewas}>
      {loading ? 'Opening…' : label}
    </Button>
  )
}
