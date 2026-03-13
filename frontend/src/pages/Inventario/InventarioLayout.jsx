import { Outlet } from 'react-router-dom';

const InventarioLayout = () => {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <Outlet />
    </div>
  );
};

export default InventarioLayout;
