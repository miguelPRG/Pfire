import ResponsiveAppBar from "./ResponsiveAppBar"; // Importando o AppBar

const Header = () => {
    return (
      <header className="bg-blue-500 text-white p-4">
        <ResponsiveAppBar></ResponsiveAppBar>
      </header>
    );
  };
  
  export default Header;