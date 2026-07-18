import React from "react";

export default function AuthLayout({ icon: Icon, tajuk, subtajuk, notaKaki, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{tajuk}</h1>
          {subtajuk && <p className="text-muted-foreground mt-2">{subtajuk}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {notaKaki && (
          <p className="text-center text-sm text-muted-foreground mt-6">{notaKaki}</p>
        )}
      </div>
    </div>
  );
}
