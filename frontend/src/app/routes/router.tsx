import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/app/layout/AppLayout";
import HomePage from "@/features/home/HomePage";
import ComponentsDemo from "@/features/demo/ComponentsDemo";


export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
            {
        path: "demo",
        element: <ComponentsDemo />,
      },
      {
        path: "catalog",
        element: <div className="container py-12"><h1>Catalogue (à venir)</h1></div>,
      },
      {
        path: "shops",
        element: <div className="container py-12"><h1>Boutiques (à venir)</h1></div>,
      },
      {
        path: "*",
        element: (
          <div className="container py-12">
            <h1 className="text-4xl font-display font-bold mb-4">404</h1>
            <p className="text-text-secondary mb-6">Page introuvable.</p>
            <a href="/" className="text-accent-cyan hover:text-accent-primary-hover">
              ← Retour à l'accueil
            </a>
          </div>
        ),
      },
    ],
  },
]);