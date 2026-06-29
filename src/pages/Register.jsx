const handleVerify = async () => {
  setError("");
  setLoading(true);

  try {
    const result = await base44.auth.verifyOtp({
      email,
      otpCode,
    });

    if (!result?.access_token) {
      throw new Error("No access token returned");
    }

    // 1. Set session
    base44.auth.setToken(result.access_token);

    // 2. Force role = student
    await base44.auth.updateMe({
      role: "student",
    });

    // 3. Get user info
    const me = await base44.auth.me();

    // 4. Create Student record (IMPORTANT FIX)
    await base44.entities.Student.create({
      user_id: me.id,
      email: me.email,
      full_name: "",
      student_id: "",
      gender: "",
      phone: "",
      status: "Registered",
      profile_completed: false,
      onboarding_step: "welcome",
    });

    // 5. Redirect
    window.location.href = "/";
  } catch (err) {
    console.error(err);
    setError(err.message || "Invalid verification code");
  } finally {
    setLoading(false);
  }
};