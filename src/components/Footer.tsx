import React, { useState } from 'react';
import { Heart, ShieldCheck, Award, X, Scale, FileText } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenVIP: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenVIP }) => {
  const [legalPanel, setLegalPanel] = useState<'privacy' | 'terms' | null>(null);

  return (
    <>
      <footer className="bg-stone-950 text-amber-200/80 border-t border-amber-800/40 py-10 px-4 sm:px-6 mt-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left text-xs sm:text-sm">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-amber-100 font-serif font-bold text-base mb-1">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Feu Sa Majesté Ibrahim Mbombo Njoya</span>
            </div>
            <p className="text-amber-300/60 text-xs">
              Souvenirs, témoignages et reconnaissance en mémoire du feu roi des Bamoun
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setLegalPanel('privacy')}
              className="text-amber-300/80 hover:text-amber-100 transition-colors underline decoration-amber-500/40"
            >
              Politique de confidentialité
            </button>
            <button
              type="button"
              onClick={() => setLegalPanel('terms')}
              className="text-amber-300/80 hover:text-amber-100 transition-colors underline decoration-amber-500/40"
            >
              Conditions d’utilisation
            </button>
          </div>

          <p className="text-[11px] text-amber-400/50">
            Réalisé par Mohamed Nasser Mounchikpou Njiemessa © 2026
          </p>
        </div>
      </footer>

      {legalPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-stone-900 text-amber-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-800/50 px-5 py-4">
              <div className="flex items-center gap-2">
                {legalPanel === 'privacy' ? <ShieldCheck className="w-5 h-5 text-amber-400" /> : <Scale className="w-5 h-5 text-amber-400" />}
                <h3 className="text-lg font-semibold text-amber-100">
                  {legalPanel === 'privacy' ? 'Politique de confidentialité' : 'Conditions d’utilisation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalPanel(null)}
                className="rounded-full p-2 text-amber-200 hover:bg-stone-800 transition-colors"
                aria-label="Fermer la fenêtre juridique"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 text-sm leading-7 text-amber-100/80">
              {legalPanel === 'privacy' ? (
                <>
                  <p>
                    Cette plateforme collecte uniquement les informations nécessaires à la publication d’un hommage numérique et à la gestion du livre d’or : prénom, nom, éventuel email, relation avec la personne honorée, message, photos et métadonnées liées à la publication.
                  </p>
                  <p>
                    Les données sont traitées avec transparence et dans le respect des principes de minimisation, de finalité limitée et de sécurité. Elles sont utilisées uniquement pour afficher les témoignages dans le livre d’hommage, les gérer administrativement et permettre la diffusion ou l’export PDF prévu par la plateforme.
                  </p>
                  <p>
                    Les contenus envoyés sont modérés et peuvent être supprimés ou refusés si ils portent atteinte à la dignité, contiennent des propos injurieux, discriminatoires, diffamatoires, illégaux ou non adaptés à un hommage mémorial.
                  </p>
                  <p>
                    Les photos et messages déposés restent soumis à la propriété intellectuelle de leurs auteurs, qui autorisent par leur publication la diffusion sur cette plateforme dans le cadre du livre d’or et de ses exportations officielles.
                  </p>
                  <p>
                    Les données ne sont ni vendues ni transmises à des tiers à des fins commerciales. Elles sont conservées seulement le temps nécessaire à l’archivage et à la gestion de l’hommage, selon les besoins opérationnels du site.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    En utilisant cette plateforme, vous acceptez d’utiliser le livre d’or uniquement à des fins respectueuses, honnêtes et liées à l’hommage de la personne honorée.
                  </p>
                  <p>
                    Vous vous engagez à ne publier ni contenu illégal, ni message hostile, ni information fausse, ni image non autorisée. Les contributions doivent respecter la dignité de la personne concernée, des proches et de la communauté.
                  </p>
                  <p>
                    L’administrateur peut valider, modifier, supprimer ou refuser un témoignage en fonction des règles de modération du site et des exigences de sécurité, de décence et de qualité éditoriale.
                  </p>
                  <p>
                    La plateforme fournit un espace de mémoire numérique, de reconnaissance et d’expression collective. Elle ne doit pas être utilisée pour des campagnes commerciales, de propagande, de diffamation ou toute activité contraire aux lois applicables.
                  </p>
                  <p>
                    Les contenus publiés sont présentés à titre de témoignages et de souvenirs. La plateforme ne garantit pas l’exactitude de chaque contribution, mais s’efforce à garantir un environnement digne, lisible et sécuritaire pour les familles et les visiteurs.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
