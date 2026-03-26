import { useEffect } from "react";

function App() {

  useEffect(() => {
    fetch("http://localhost:3000/api/test")
      .then(res => res.json())
      .then(data => {
        console.log("Respuesta backend:", data);
        alert(data.mensaje);
      })
      .catch(err => console.error(err));
  }, []);

  return <h1>Conectando con backend...</h1>;
}

export default App;