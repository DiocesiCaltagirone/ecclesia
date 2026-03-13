import { Outlet } from 'react-router-dom';

const InventarioLayout = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4">
        <Outlet />
      </div>
    </div>
  );
};

export default InventarioLayout;
