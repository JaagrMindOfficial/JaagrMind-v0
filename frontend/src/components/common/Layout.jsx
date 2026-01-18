import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import './Layout.css';

const Layout = ({ children, title, subtitle }) => {
    return (
        <div className="layout">
            <Sidebar />
            <Header title={title} subtitle={subtitle} />
            <main className="layout-main">
                {children}
            </main>
            <MobileNav />
        </div>
    );
};

export default Layout;
