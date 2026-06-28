const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    await base44.auth.loginViaEmailPassword(email, password);

    // ONLY THIS REDIRECT
    window.location.replace("/");
  } catch (err) {
    setError(err.message || "Invalid login");
  } finally {
    setLoading(false);
  }
};