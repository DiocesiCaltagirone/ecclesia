import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SelectEnte from './pages/SelectEnte';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Persone from './pages/Persone';
import ImpostazioniDatiGenerali from './pages/ImpostazioniDatiGenerali';
import Registro from './pages/Registro';
import Amministrazione from './pages/Amministrazione';
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
import NuovoRendiconto from './pages/Contabilita/NuovoRendiconto';  // ← NUOVO
import ListaRendiconti from './pages/Contabilita/ListaRendiconti';  // ← NUOVO
import EconomatoContabilita from './pages/EconomatoContabilita';

// Componente per proteggere le rotte
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/select-ente" element={
            <PrivateRoute>
              <SelectEnte />
            </PrivateRoute>
          } />

          {/* Layout Principale - Sidebar standard */}
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="persone" element={<Persone />} />
            <Route path="impostazioni/dati-generali" element={<ImpostazioniDatiGenerali />} />
            <Route path="registro" element={<Registro />} />
          </Route>

          {/* Contabilità - Layout separato con sidebar propria */}
          <Route path="/contabilita" element={
            <PrivateRoute>
              <ContabilitaLayout />
            </PrivateRoute>
          }>
            <Route index element={<Conti />} />
            <Route path="categoria" element={<Categorie />} />
            <Route path="movimenti" element={<MovimentiGenerale />} />
            <Route path="conti/:registroId/movimenti" element={<MovimentiConto />} />
            <Route path="rapporti" element={<Rapporti />} />
            <Route path="rendiconto" element={<Rendiconto />} />
            <Route path="rendiconto/nuovo" element={<NuovoRendiconto />} />      {/* ← NUOVO */}
            <Route path="rendiconto/lista" element={<ListaRendiconti />} />      {/* ← NUOVO */}
          </Route>

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

          <Route path="/amministrazione" element={
            <PrivateRoute>
              <Amministrazione />
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

          <Route path="/amministrazione/template-categorie" element={
            <PrivateRoute>
              <TemplateCategorieAdmin />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;