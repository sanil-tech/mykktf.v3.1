const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    // 1. LOGIN
    await base44.auth.loginViaEmailPassword(email, password);

    // 2. AUTH USER
    const auth = await base44.auth.me();

    // 3. ONLY TRUST user_id (IMPORTANT FIX)
    const students = await base44.entities.Student.filter({
      user_id: auth.id,
    });

    let profile = students?.[0];

    // 4. CREATE PROFILE IF MISSING
    if (!profile) {
      profile = await base44.entities.Student.create({
        user_id: auth.id,
        email: auth.email,
        role: "student", // FIXED
        onboarding_status: "pending",
      });
    }

    // 5. ONBOARDING CHECK (STRICT)
    const isIncomplete =
      !profile.full_name ||
      !profile.phone ||
      !profile.faculty ||
      !profile.room_id;

    const mustOnboard =
      profile.onboarding_status !== "completed";

    if (mustOnboard || isIncomplete) {
      window.location.href = "/onboarding";
      return;
    }

    // 6. ROLE ROUTING (SAFE)
    const role = profile.role || auth.role || "student";

    switch (role) {
      case "warden":
        window.location.href = "/warden";
        break;

      case "jakmas":
        window.location.href = "/jakmas";
        break;

      case "admin":
        window.location.href = "/admin";
        break;

      default:
        window.location.href = "/";
    }

  } catch (err) {
    setError(err.message || "Invalid email or password");
  } finally {
    setLoading(false);
  }
};