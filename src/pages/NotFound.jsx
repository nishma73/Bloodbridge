import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <Logo />
      <h1 className="mt-6 text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-gray-500">
        We couldn't find that page. It may have moved or never existed.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  )
}
