/** The pre-filled WhatsApp message the customer sends after placing an order. */

interface MessageOrder {
  number: string
  customer: { name: string; phone: string; governorate: string; city: string; address: string; notes?: string | null }
  items: { name: { ar: string; en: string }; color?: string | null; size: string; qty: number; price: number }[]
  subtotal: number
}

const money = (n: number, lang: 'ar' | 'en') => `${n.toLocaleString('en-US')} ${lang === 'ar' ? 'جنيه' : 'EGP'}`

export function orderMessage(order: MessageOrder, lang: 'ar' | 'en') {
  const c = order.customer
  const lines = order.items.map(
    (i) => `• ${i.name[lang]}${i.color ? ` (${i.color})` : ''} - ${lang === 'ar' ? 'مقاس' : 'Size'} ${i.size} × ${i.qty} = ${money(i.price * i.qty, lang)}`,
  )
  const text =
    lang === 'ar'
      ? [
          `طلب جديد #${order.number}`,
          '',
          `الاسم: ${c.name}`,
          `الموبايل: ${c.phone}`,
          `العنوان: ${c.governorate}، ${c.city}، ${c.address}`,
          '',
          ...lines,
          '',
          `الإجمالي: ${money(order.subtotal, lang)} (من غير الشحن)`,
          c.notes ? `ملاحظات: ${c.notes}` : '',
        ]
      : [
          `New order #${order.number}`,
          '',
          `Name: ${c.name}`,
          `Phone: ${c.phone}`,
          `Address: ${c.address}, ${c.city}, ${c.governorate}`,
          '',
          ...lines,
          '',
          `Subtotal: ${money(order.subtotal, lang)} (shipping not included)`,
          c.notes ? `Notes: ${c.notes}` : '',
        ]
  return text.filter((l, i, all) => !(l === '' && i === all.length - 1)).join('\n')
}

export function whatsappLink(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/** Opens a chat with the customer from the dashboard (Egyptian 01… → 201…). */
export function customerChatLink(phone: string) {
  return `https://wa.me/${phone.replace(/^0/, '20')}`
}
