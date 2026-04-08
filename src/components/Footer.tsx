import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";

export const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <img src={logo} alt="T-Bode" className="h-10 mb-4" />
            <div className="flex gap-4 mb-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-body">Facebook</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-body">Twitter</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-body">Instagram</a>
            </div>
            <div className="text-xs text-muted-foreground font-body space-y-1">
              <p><strong className="text-foreground">Company Information</strong></p>
              <p>SIA Ervitex Registration No.: 40002074377</p>
              <p>VAT No.: LV40002074377</p>
              <p>Legal Address: 29-2 Braslas Street, Riga, LV-1084, Latvia</p>
            </div>
          </div>

          {/* Stores */}
          <div>
            <h4 className="font-body font-bold mb-4">Our Stores</h4>
            <div className="space-y-3 text-sm text-muted-foreground font-body">
              <div>
                <p className="font-semibold text-foreground">T/C DOMINA</p>
                <p>Tel.: +371 67130030</p>
                <p>domina@t-bode.lv</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">T/C ORIGO</p>
                <p>Tel.: +371 28603383</p>
                <p>origo@t-bode.lv</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">T/C AKROPOLE</p>
                <p>Tel.: +371 20219844</p>
                <p>akropole@t-bode.lv</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-body font-bold mb-4">Online Store Support</h4>
            <div className="text-sm text-muted-foreground font-body space-y-1">
              <p>Phone: +371 29475227</p>
              <p>Email: info@t-bode.lv</p>
              <p>www.t-bode.lv</p>
            </div>
          </div>

          {/* Important */}
          <div>
            <h4 className="font-body font-bold mb-4">Important</h4>
            <div className="space-y-2 text-sm font-body">
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Terms and Conditions</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Shipping and Returns</a>
            </div>
            <div className="mt-6">
              <h4 className="font-body font-bold mb-2">Our Partners</h4>
              <div className="space-y-1 text-sm text-muted-foreground font-body">
                <p>www.etx.lv</p>
                <p>stanleystella.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-body">© T-Bode Store 2026</p>
          {/* Hidden admin login trigger */}
          <button
            className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1"
            title="Admin"
            onClick={() => {
              // Will connect to admin auth later
              console.log("Admin login triggered");
            }}
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
