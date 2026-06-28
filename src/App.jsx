const [user, setUser] = useState(undefined); 
// undefined = loading
// null = not logged in
// object = logged in

useEffect(() => {
  let active = true;

  const run = async () => {
    try {
      const u = await base44.auth.me();
      if (!active) return;
      setUser(u || null);
    } catch (e) {
      setUser(null);
    }
  };

  run();

  return () => { active = false };
}, []);