import { NavLink } from "react-router";

export default function About() {

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 gap-8">

        <h1 className="text-4xl font-bold tracking-tight">
          The Example About Page
        </h1>

        <p className="text-sm text-gray-500">
          Here there will be information regarding CommitCV
        </p>

        <nav>
          <NavLink to="/" end>Home</NavLink>
        </nav>

      </div>
    </>
  )
}



