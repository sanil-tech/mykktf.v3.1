const loadUser = async () => {
  try {
    setLoading(true);

    const auth = await base44.auth.me();

    // 🔥 TRY MULTIPLE MATCHING STRATEGIES (VERY IMPORTANT FIX)
    let students = await base44.entities.Student.filter({
      user_id: auth.id,
    });

    // fallback 1: email match
    if (!students.length) {
      students = await base44.entities.Student.filter({
        email: auth.email,
      });
    }

    const profile = students?.[0] || null;

    const merged = {
      id: auth.id,
      email: auth.email,
      role: auth.role,
      ...profile,
    };

    setUser(merged);
  } catch (error) {
    console.error("Failed to load user:", error);
    setUser(null);
  } finally {
    setLoading(false);
  }
};