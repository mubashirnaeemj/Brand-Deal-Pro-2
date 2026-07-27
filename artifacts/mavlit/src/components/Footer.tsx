import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4 text-primary-foreground"
                >
                  <path d="M4 14l8-10 8 10M4 20h16" />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-white">MAVLIT</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs text-center md:text-left">
              The precision toolkit for creators who treat their craft like a business.
            </p>
          </div>
          
          <div className="flex gap-8">
            <div className="flex flex-col gap-3">
              <h4 className="text-white font-medium text-sm">Product</h4>
              <a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Features</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Pricing</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-white transition-colors">Changelog</a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-white font-medium text-sm">Legal</h4>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MAVLIT Inc. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-white transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
