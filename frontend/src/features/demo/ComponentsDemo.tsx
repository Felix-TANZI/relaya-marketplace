// frontend/src/features/demo/ComponentsDemo.tsx
// Composant de démonstration des composants UI Relaya

import { Button, Input, Card, Badge } from "@/components/ui";
import { Heart, Star, ShoppingCart, Zap } from "lucide-react";

export default function ComponentsDemo() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-16">
      <div className="text-center">
        <h1 className="font-display font-bold text-4xl mb-4 text-dark-text">
          Composants UI Relaya
        </h1>
        <p className="text-dark-text-secondary text-lg">
          Design system holographique premium
        </p>
      </div>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-dark-text">Buttons</h2>
        
        <Card>
          <h3 className="font-semibold mb-4 text-dark-text">Variantes</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="gradient">
              <Star size={18} />
              Gradient Button
            </Button>
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4 text-dark-text">Tailles</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4 text-dark-text">États</h3>
          <div className="flex flex-wrap gap-4">
            <Button isLoading>Loading...</Button>
            <Button disabled>Disabled</Button>
            <Button variant="gradient">
              <ShoppingCart size={18} />
              Avec icône
            </Button>
          </div>
        </Card>
      </section>

      {/* Inputs */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-dark-text">Inputs</h2>
        
        <Card className="max-w-md">
          <div className="space-y-4">
            <Input 
              label="Email"
              type="email"
              placeholder="votre@email.com"
              helperText="Nous ne partagerons jamais votre email"
            />
            <Input 
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
            />
            <Input 
              label="Téléphone"
              type="tel"
              placeholder="+237 6XX XXX XXX"
              error="Format invalide"
            />
          </div>
        </Card>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-dark-text">Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="default" hover>
            <h3 className="font-display font-semibold text-lg mb-2 text-dark-text">Default Card</h3>
            <p className="text-dark-text-secondary text-sm">
              Effet glassmorphism avec hover
            </p>
          </Card>
          
          <Card variant="elevated" hover>
            <h3 className="font-display font-semibold text-lg mb-2 text-dark-text">Elevated Card</h3>
            <p className="text-dark-text-secondary text-sm">
              Plus d'élévation et d'ombre
            </p>
          </Card>
          
          <Card variant="bordered" hover>
            <h3 className="font-display font-semibold text-lg mb-2 text-dark-text">Bordered Card</h3>
            <p className="text-dark-text-secondary text-sm">
              Bordure plus épaisse
            </p>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-dark-text">Badges</h2>
        
        <Card>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="cyan">
              <Zap size={12} />
              Cyan
            </Badge>
            <Badge variant="purple">Purple</Badge>
            <Badge variant="pink">
              <Heart size={12} />
              Pink
            </Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </Card>
      </section>

      {/* Combined Example */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-dark-text">Exemple Combiné</h2>
        
        <Card variant="elevated" className="max-w-md mx-auto">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-xl text-dark-text mb-1">
                  Produit Premium
                </h3>
                <Badge variant="cyan">Nouveau</Badge>
              </div>
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Heart className="text-dark-text-secondary hover:text-holo-pink transition-colors" size={20} />
              </button>
            </div>
            
            <p className="text-dark-text-secondary">
              Description du produit avec un design holographique premium.
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="font-display font-bold text-2xl text-gradient animate-gradient-bg">
                25,000 FCFA
              </span>
              <Button variant="gradient" size="sm">
                <ShoppingCart size={16} />
                Acheter
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}