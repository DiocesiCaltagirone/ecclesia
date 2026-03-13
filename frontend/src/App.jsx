import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SelectEnte from './pages/SelectEnte';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import Persone from './pages/Persone';
import ImpostazioniDatiGenerali from './pages/ImpostazioniDatiGenerali';
import Registro from './pages/Registro';
import Amministrazione from './pages/Amministrazione';
import ImpostazioniDiocesi from './pages/ImpostazioniDiocesi';
import ParrocchieDiocesi from './pages/ParrocchieDiocesi';
import TemplateCategorieAdmin from './pages/TemplateCategorieAdmin';
import GestioneEnti from './pages/GestioneEnti';
import GestioneUtenti from './pages/GestioneUtenti';
import { DataProvider } from './contexts/DataContext';

// Import Contabilità
import ContabilitaLayout from './pages/Contabilita/ContabilitaLayout';
import Conti from './pages/Contabilita/Conti';
import Categorie from './pages/Contabilita/Categorie';
import Rapporti from './pages/Contabilita/Rapporti';
import MovimentiConto from './pages/Contabilita/MovimentiConto';
import MovimentiGenerale from './pages/Contabilita/MovimentiGenerale';
import Rendiconto from './pages/Contabilita/Rendiconto';
import NuovoRendiconto from './pages/Contabilita/NuovoRendiconto';
import ListaRendiconti from './pages/Contabilita/ListaRendiconti';
import EconomatoContabilita from './pages/EconomatoContabilita';

// Import Inventario
import InventarioLayout from './pages/Inventario/InventarioLayout';
import ListaBeni from './pages/Inventario/ListaBeni';
import NuovoBene from './pages/Inventario/NuovoBene';
import SchedaBene from './pages/Inventario/SchedaBene';
import ListaRegistri from './pages/Inventario/ListaRegistri';
import StoricoInventario from './pages/Inventario/StoricoInventario';
import ImpostazioniInventario from './pages/Inventario/ImpostazioniInventario';
import StampaInventario from './pages/Inventario/StampaInventario';

// Componente per proteggere le rotte
function PrivateRoute({ children }) {
  const token = sessionStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Verifica se il token JWT è scaduto
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }
  } catch {
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    const interval = setInterval(() => {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            sessionStorage.clear();
            window.location.href = '/login';
          }
        } catch {
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          {/* Pagine senza layout */}
          <Route path="/login" element={<Login />} />

          <Route path="/select-ente" element={
            <PrivateRoute>
              <SelectEnte />
            </PrivateRoute>
          } />

          {/* Pagine amministrazione — standalone senza AppShell */}
          <Route path="/amministrazione" element={
            <PrivateRoute>
              <Amministrazione />
            </PrivateRoute>
          } />

          <Route path="/gestione-enti" element={
            <PrivateRoute>
              <GestioneEnti />
            </PrivateRoute>
          } />

          <Route path="/gestione-utenti" element={
            <PrivateRoute>
              <GestioneUtenti />
            </PrivateRoute>
          } />

          <Route path="/economo/contabilita" element={
            <PrivateRoute>
              <EconomatoContabilita />
            </PrivateRoute>
          } />

          <Route path="/amministrazione/parrocchie-diocesi" element={
            <PrivateRoute>
              <ParrocchieDiocesi />
            </PrivateRoute>
          } />

          <Route path="/amministrazione/impostazioni-diocesi" element={
            <PrivateRoute>
              <ImpostazioniDiocesi />
            </PrivateRoute>
          } />

          <Route path="/amministrazione/template-categorie" element={
            <PrivateRoute>
              <TemplateCategorieAdmin />
            </PrivateRoute>
          } />

          {/* TUTTO il resto dentro AppShell */}
          <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/persone" element={<Persone />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/impostazioni/dati-generali" element={<ImpostazioniDatiGenerali />} />

            {/* Contabilità */}
            <Route path="/contabilita" element={<ContabilitaLayout />}>
              <Route index element={<Conti />} />
              <Route path="categoria" element={<Categorie />} />
              <Route path="movimenti" element={<MovimentiGenerale />} />
              <Route path="conti/:registroId/movimenti" element={<MovimentiConto />} />
              <Route path="rapporti" element={<Rapporti />} />
              <Route path="rendiconto" element={<Rendiconto />} />
              <Route path="rendiconto/nuovo" element={<NuovoRendiconto />} />
              <Route path="rendiconto/:id" element={<NuovoRendiconto />} />
              <Route path="rendiconto/lista" element={<ListaRendiconti />} />
            </Route>

            {/* Inventario */}
            <Route path="/inventario" element={<InventarioLayout />}>
              <Route index element={<Navigate to="/inventario/beni" replace />} />
              <Route path="beni" element={<ListaBeni />} />
              <Route path="beni/nuovo" element={<NuovoBene />} />
              <Route path="beni/:id" element={<SchedaBene />} />
              <Route path="registri" element={<ListaRegistri />} />
              <Route path="storico" element={<StoricoInventario />} />
              <Route path="stampa" element={<StampaInventario />} />
              <Route path="impostazioni" element={<ImpostazioniInventario />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
