"use client"

import { useState } from "react"

import Login from "@modules/account/components/login"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState("sign-in")

  return (
    <div className="w-full flex items-center justify-center min-h-[60vh] px-6 py-16">
      <Login setCurrentView={setCurrentView} />
    </div>
  )
}

export default LoginTemplate
