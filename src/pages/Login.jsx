const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (processing) return;
  setProcessing(true);
  setLoading(true);

  try {
    await base44.auth.loginViaEmailPassword(email, password);

    // DO NOTHING ELSE HERE
    // let App.jsx handle routing
    navigate("/", { replace: true });

  } catch (err) {
    setError(err.message || "Invalid email or password");
  } finally {
    setLoading(false);
    setProcessing(false);
  }
};