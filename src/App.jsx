const [user, setUser] = useState(undefined); 
// undefined = loading
// null = not logged in
// object = logged in

useEffect(() => {
  const run = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u || null);
    } catch {
      setUser(null);
    }
  };

  run();
}, []);