export default function Amount({ value }) {
  const formatted = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return <span>$ {formatted}</span>
}
