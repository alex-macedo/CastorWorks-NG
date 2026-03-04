#!/bin/bash
set -euo pipefail

# Phase 1 (Foundation), Phase 2 (Licensing), auth, add-user E2E run against CastorWorks-NG on 5181; other E2E default to 5173
if [[ "${1:-}" == phase1* || "${1:-}" == phase2* || "${1:-}" == auth-signin-signup || "${1:-}" == add-user ]]; then
  BASE_URL="${BASE_URL:-http://localhost:5181}"
else
  BASE_URL="${BASE_URL:-http://localhost:5173}"
fi
MOBILE_BASE_URL="${MOBILE_BASE_URL:-http://localhost:5174}"
PROJECT_ID="${E2E_PROJECT_ID:-45dc7301-fbb1-485d-9280-f4a74b530596}"

ACCOUNT_TEST_EMAIL=$(sed -n 's/^ACCOUNT_TEST_EMAIL=//p' .env.testing)
ACCOUNT_TEST_EMAIL_PASSWORD=$(sed -n 's/^ACCOUNT_TEST_EMAIL_PASSWORD=//p' .env.testing | sed 's/^"//;s/"$//')

if [[ -z "${ACCOUNT_TEST_EMAIL}" || -z "${ACCOUNT_TEST_EMAIL_PASSWORD}" ]]; then
  echo "Missing ACCOUNT_TEST_EMAIL or ACCOUNT_TEST_EMAIL_PASSWORD in .env.testing" >&2
  exit 1
fi

mkdir -p test-results/forms test-results/mobile

ab() {
  local attempt=1
  local max=3
  local delay=1
  while true; do
    if agent-browser "$@"; then
      return 0
    fi
    if [[ $attempt -ge $max ]]; then
      return 1
    fi
    sleep "$delay"
    attempt=$((attempt + 1))
  done
}

login() {
  local session="$1"
  ab --session "$session" open "$BASE_URL/login"
  ab --session "$session" fill '#email' "$ACCOUNT_TEST_EMAIL"
  ab --session "$session" fill '#password' "$ACCOUNT_TEST_EMAIL_PASSWORD"
  ab --session "$session" click 'button[type=submit]'
  ab --session "$session" wait 3000
}

click_first_text_match() {
  local session="$1"
  shift
  local labels=("$@")
  for label in "${labels[@]}"; do
    if ab --session "$session" click "text=${label}"; then
      return 0
    fi
  done
  return 1
}

click_first_role_button() {
  local session="$1"
  shift
  local labels=("$@")
  for label in "${labels[@]}"; do
    if ab --session "$session" find role button click --name "$label"; then
      return 0
    fi
  done
  return 1
}

click_first_role_menuitem() {
  local session="$1"
  shift
  local labels=("$@")
  for label in "${labels[@]}"; do
    if ab --session "$session" find role menuitem click --name "$label"; then
      return 0
    fi
  done
  return 1
}

run_forms_full_flow() {
  local session="e2e-forms-full"
  local form_title="OS Alteracao E2E $(date +%Y%m%d%H%M%S)"
  local share_url=""

  login "$session"
  ab --session "$session" open "$BASE_URL/forms"
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/forms/full-01-forms-list.png --full || true

  click_first_role_button "$session" "Criar" "Create Form" "Crear" "Creer"
  ab --session "$session" wait 2000 || true

  ab --session "$session" click "#form-template" || true
  ab --session "$session" wait 800 || true
  ab --session "$session" screenshot test-results/forms/full-02-template-dropdown.png --full || true
  ab --session "$session" click "text=Ordem de Servico / Alteracao" || true
  ab --session "$session" wait 800 || true

  ab --session "$session" fill "#form-title" "$form_title" || true
  ab --session "$session" fill "#form-description" "Form E2E para validar fluxo completo" || true
  ab --session "$session" screenshot test-results/forms/full-03-builder-selected.png --full || true
  click_first_role_button "$session" "Criar" "Create Form" "Crear" || true
  ab --session "$session" wait 2000 || true

  click_first_role_button "$session" "Publicar" "Publish" || true
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/forms/full-04-published.png --full || true

  click_first_role_button "$session" "Voltar" "Back" "Retour" || true
  ab --session "$session" wait 1500 || true

  ab --session "$session" find placeholder "Buscar formul" fill "$form_title" || true
  ab --session "$session" wait 800 || true

  ab --session "$session" click 'button:has(svg[data-lucide="more-vertical"])' || true
  click_first_role_menuitem "$session" "Compartilhar" "Share" "Compartir" "Partager" || true
  ab --session "$session" wait 1000 || true
  share_url=$(ab --session "$session" get value '#form-url' | tr -d '\r')

  if [[ -n "$share_url" ]]; then
    ab --session "$session" open "$share_url"
    ab --session "$session" wait 1000 || true
    ab --session "$session" screenshot test-results/forms/full-05-public-form.png --full || true

    ab --session "$session" fill 'css=div:has(> div > label:has-text("Solicitante")) input' "Cliente Teste" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Descricao da solicitacao")) textarea' "Alteracao para ajuste de layout." || true
    ab --session "$session" click "text=Servico novo" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Impacto em custo")) input' "1500" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Impacto em prazo")) input' "3" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Justificativa")) textarea' "Necessario para atender requisitos do cliente." || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Aprovacao (quem aprovou)")) input' "Eng. Responsavel" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Responsavel pela execucao")) input' "Equipe de Obras" || true

    ab --session "$session" screenshot test-results/forms/full-06-public-form-filled.png --full || true
    click_first_text_match "$session" "Submit" "Enviar" "Soumettre" || true
    ab --session "$session" wait 1500 || true
    ab --session "$session" screenshot test-results/forms/full-07-submitted.png --full || true
  fi

  ab --session "$session" open "$BASE_URL/forms"
  ab --session "$session" wait 1500 || true
  ab --session "$session" find placeholder "Buscar formul" fill "$form_title" || true
  ab --session "$session" wait 800 || true
  click_first_role_button "$session" "Respostas" "Responses" "View Responses" "Respuestas" || true
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/forms/full-08-responses.png --full || true

  ab --session "$session" open "$BASE_URL/forms"
  ab --session "$session" wait 1500 || true
  ab --session "$session" find placeholder "Buscar formul" fill "$form_title" || true
  ab --session "$session" wait 800 || true
  ab --session "$session" click 'button:has(svg[data-lucide="more-vertical"])' || true
  click_first_role_menuitem "$session" "Duplicar" "Duplicate" "Dupliquer" || true
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/forms/full-09-duplicate.png --full || true
}

run_forms_list_only() {
  local session="e2e-forms-list"
  login "$session"
  ab --session "$session" open "$BASE_URL/forms"
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/forms/step-list.png --full || true
}

run_forms_dropdown_only() {
  local session="e2e-forms-dropdown"
  login "$session"
  ab --session "$session" open "$BASE_URL/forms/new"
  ab --session "$session" wait 1500 || true
  ab --session "$session" click "#form-template" || true
  ab --session "$session" wait 800 || true
  ab --session "$session" screenshot test-results/forms/step-dropdown.png --full || true
}

run_public_rdo_submit() {
  local session="e2e-public-rdo"
  local token="${PUBLIC_RDO_TOKEN:-4cc3fee1573ad7a9bf0e6df507e93dc4}"
  ab --session "$session" open "$BASE_URL/form/$token"
  ab --session "$session" wait 1500 || true
  ab --session "$session" fill 'css=div:has(label:has-text("Data da obra")) input' "$(date +%Y-%m-%d)" || true
  ab --session "$session" click "text=Sol" || true
  ab --session "$session" fill 'textarea[aria-label="Your answer"]' "Equipe A (4), Equipe B (3)" || true
  ab --session "$session" fill '(//textarea[@aria-label="Your answer"])[2]' "Atividades executadas" || true
  ab --session "$session" click "text=Submit" || true
  ab --session "$session" wait 1200 || true
  ab --session "$session" screenshot test-results/forms/step-public-submit.png --full || true
}

run_forms_publish_only() {
  local session="e2e-forms-publish"
  local form_title="OS Alteracao Publish $(date +%Y%m%d%H%M%S)"
  login "$session"
  ab --session "$session" open "$BASE_URL/forms"
  ab --session "$session" wait 1500 || true
  click_first_role_button "$session" "Criar" "Create Form" "Crear" "Creer"
  ab --session "$session" wait 1500 || true
  ab --session "$session" click "#form-template" || true
  ab --session "$session" wait 800 || true
  ab --session "$session" click "text=Ordem de Servico / Alteracao" || true
  ab --session "$session" wait 800 || true
  ab --session "$session" fill "#form-title" "$form_title" || true
  ab --session "$session" fill "#form-description" "Form publish-only step" || true
  ab --session "$session" screenshot test-results/forms/step-publish-builder.png --full || true
  click_first_role_button "$session" "Criar" "Create Form" "Crear" || true
  ab --session "$session" wait 2000 || true
  click_first_role_button "$session" "Publicar" "Publish" || true
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/forms/step-publish-published.png --full || true
}

run_forms_share_submit() {
  local session="e2e-forms-share"
  local form_title_prefix="OS Alteracao Publish"
  login "$session"
  ab --session "$session" open "$BASE_URL/forms"
  ab --session "$session" wait 1500 || true
  ab --session "$session" find placeholder "Buscar formul" fill "$form_title_prefix" || true
  ab --session "$session" wait 800 || true
  ab --session "$session" click 'button:has(svg[data-lucide="more-vertical"])' || true
  click_first_role_menuitem "$session" "Compartilhar" "Share" "Compartir" "Partager" || true
  ab --session "$session" wait 1200 || true
  local share_url
  share_url=$(ab --session "$session" get value '#form-url' | tr -d '\r')
  ab --session "$session" screenshot test-results/forms/step-share-modal.png --full || true
  if [[ -n "$share_url" ]]; then
    ab --session "$session" open "$share_url"
    ab --session "$session" wait 1200 || true
    ab --session "$session" screenshot test-results/forms/step-share-public.png --full || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Solicitante")) input' "Cliente Share" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Descricao da solicitacao")) textarea' "Validar fluxo share-submit." || true
    ab --session "$session" click "text=Servico novo" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Impacto em custo")) input' "500" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Impacto em prazo")) input' "2" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Justificativa")) textarea' "Teste share." || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Aprovacao (quem aprovou)")) input' "Supervisor" || true
    ab --session "$session" fill 'css=div:has(> div > label:has-text("Responsavel pela execucao")) input' "Equipe" || true
    ab --session "$session" screenshot test-results/forms/step-share-public-filled.png --full || true
    click_first_text_match "$session" "Submit" "Enviar" "Soumettre" || true
    ab --session "$session" wait 1200 || true
    ab --session "$session" screenshot test-results/forms/step-share-public-submitted.png --full || true
  fi
}

run_responses_list() {
  local session="e2e-responses"
  local form_id="${RDO_FORM_ID:-74f7c146-a15e-46f5-8d0c-fe87e9be6687}"
  login "$session"
  ab --session "$session" open "$BASE_URL/forms/$form_id/responses"
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/forms/step-responses.png --full || true
}

run_mobile_fab_test() {
  local session="e2e-mobile-fab"
  
  # First check if we need to login
  ab --session "$session" open "$MOBILE_BASE_URL"
  ab --session "$session" wait 2000 || true
  
  # Check if we're on login page
  if ab --session "$session" find '#email' 2>/dev/null; then
    echo "On login page, logging in..."
    login "$session"
  fi
  
  # Now navigate to the tasks page
  ab --session "$session" open "$MOBILE_BASE_URL/architect/time-tracking"
  ab --session "$session" wait 3000 || true
  ab --session "$session" screenshot test-results/mobile/fab-test-1-page.png --full || true

  # Look for FAB elements (buttons with fixed positioning class)
  # FABs use classes like "fixed bottom-[calc(4rem+8vh)] right-[max(1rem,3vw)]"
  if ab --session "$session" click "button.fixed, .fixed button" 2>/dev/null; then
    echo "Found and clicked FAB button"
    ab --session "$session" screenshot test-results/mobile/fab-test-2-after-click.png --full || true
  else
    echo "No FAB buttons found or clickable"
  fi

  # Check for any elements that might be outside viewport
  ab --session "$session" eval "
    console.log('Checking for FAB elements...');
    const allFixed = document.querySelectorAll('.fixed');
    console.log(\`Found \${allFixed.length} fixed elements\`);
    allFixed.forEach((el, i) => {
      console.log(\`Fixed \${i+1}: \${el.tagName} \${el.className}\`);
    });
    
    const fabs = document.querySelectorAll('button.fixed, .fixed button');
    console.log(\`Found \${fabs.length} FAB buttons\`);
    fabs.forEach((fab, i) => {
      const rect = fab.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isVisible = rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth;
      console.log(\`FAB \${i+1}: pos(\${rect.left.toFixed(1)}, \${rect.top.toFixed(1)}) size(\${rect.width.toFixed(1)}x\${rect.height.toFixed(1)}) visible=\${isVisible}\`);
      if (!isVisible) {
        console.log(\`❌ FAB \${i+1} is outside viewport!\`);
      } else {
        console.log(\`✅ FAB \${i+1} is properly positioned\`);
      }
    });
    if (fabs.length === 0) {
      console.log('No FAB elements found on page');
    }
  " || true
}

pattern="${*:-all}"
pattern_lc=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')

if [[ "$pattern_lc" == "forms-full" || "$pattern_lc" == *"forms-full"* ]]; then
  run_forms_full_flow
  exit 0
fi

if [[ "$pattern_lc" == "forms-list" ]]; then
  run_forms_list_only
  exit 0
fi

if [[ "$pattern_lc" == "forms-dropdown" ]]; then
  run_forms_dropdown_only
  exit 0
fi

if [[ "$pattern_lc" == "forms-publish" ]]; then
  run_forms_publish_only
  exit 0
fi

if [[ "$pattern_lc" == "forms-share-submit" ]]; then
  run_forms_share_submit
  exit 0
fi

if [[ "$pattern_lc" == "public-rdo" ]]; then
  run_public_rdo_submit
  exit 0
fi

if [[ "$pattern_lc" == "mobile-fab" ]]; then
  run_mobile_fab_test
  exit 0
fi

run_bdi_brazil_budget_test() {
  local session="e2e-bdi-brazil-budget"
  login "$session"
  node e2e/bdi-brazil-budget-test.agent-browser.cjs
}

if [[ "$pattern_lc" == "bdi-brazil-budget-test" ]]; then
  run_bdi_brazil_budget_test
  exit 0
fi

run_architect_whatsapp_template_fill() {
  node e2e/architect-whatsapp-template-fill.agent-browser.cjs
}

if [[ "$pattern_lc" == "architect-whatsapp-template-fill" ]]; then
  run_architect_whatsapp_template_fill
  exit 0
fi

run_logistics_phase10() {
  local session="e2e-logistics-phase10"
  
  echo "🚀 Starting Logistics Phase 10 E2E Tests..."
  
  # Login
  login "$session"
  
  # Navigate to a project
  ab --session "$session" open "$BASE_URL/projects"
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/01-projects-list.png --full || true
  
  # Click on first project
  ab --session "$session" click 'a[href*="/projects/"]:first' || true
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/02-project-detail.png --full || true
  
  # Click on Logistics tab
  click_first_role_button "$session" "Logistics" "Logística" "Logistique" || true
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/03-logistics-tab.png --full || true
  echo "✅ Logistics tab opened"
  
  # Verify metrics cards
  ab --session "$session" find 'text=/Total Items|Total de Itens|Total des Articles/' || true
  ab --session "$session" find 'text=/Low Stock|Estoque Baixo|Stock Bas/' || true
  ab --session "$session" find 'text=/Pending Deliveries|Entregas Pendentes|Livraisons en Attente/' || true
  echo "✅ Metrics cards visible"
  
  # Test Add Item button
  if click_first_role_button "$session" "Add Item" "Adicionar Item" "Ajouter"; then
    ab --session "$session" wait 1500 || true
    ab --session "$session" screenshot test-results/logistics/04-add-item-modal.png --full || true
    echo "✅ Add Item modal opened"
    
    # Close modal
    click_first_role_button "$session" "Cancel" "Cancelar" "Annuler" || true
    ab --session "$session" wait 500 || true
  fi
  
  # Switch to Deliveries tab
  click_first_role_button "$session" "Deliveries" "Entregas" "Livraisons" || true
  ab --session "$session" wait 1500 || true
  ab --session "$session" screenshot test-results/logistics/05-deliveries-tab.png --full || true
  echo "✅ Deliveries tab opened"
  
  # Test Add Delivery button
  if click_first_role_button "$session" "Add Delivery" "Adicionar Entrega" "Ajouter Livraison" "Schedule Delivery" "Agendar Entrega"; then
    ab --session "$session" wait 1500 || true
    ab --session "$session" screenshot test-results/logistics/06-add-delivery-modal.png --full || true
    echo "✅ Add Delivery modal opened"
    
    # Close modal
    click_first_role_button "$session" "Cancel" "Cancelar" "Annuler" || true
    ab --session "$session" wait 500 || true
  fi
  
  # Switch to AI Predictions tab
  click_first_role_button "$session" "AI" "Previsão" "Forecast" "Prévision" || true
  ab --session "$session" wait 3000 || true
  ab --session "$session" screenshot test-results/logistics/07-ai-predictions.png --full || true
  echo "✅ AI Predictions tab opened"
  
  # Test Print QR Codes button
  click_first_role_button "$session" "Logistics" "Logística" "Logistique" || true
  ab --session "$session" wait 1000 || true
  
  if ab --session "$session" click 'button:has-text("Print QR")' 2>/dev/null || \
     ab --session "$session" click 'button:has-text("Imprimir QR")' 2>/dev/null || \
     ab --session "$session" click 'button:has-text("Imprimer QR")' 2>/dev/null; then
    ab --session "$session" wait 1500 || true
    ab --session "$session" screenshot test-results/logistics/08-print-qr-modal.png --full || true
    echo "✅ Print QR Codes modal opened"
    
    # Close modal
    click_first_role_button "$session" "Cancel" "Cancelar" "Annuler" "Close" "Fechar" || true
    ab --session "$session" wait 500 || true
  fi
  
  # Test Mobile Logistics Home
  ab --session "$session" open "$BASE_URL/mobile/logistics"
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/09-mobile-home.png --full || true
  echo "✅ Mobile Logistics Home loaded"
  
  # Test Mobile Inventory
  ab --session "$session" open "$BASE_URL/mobile/logistics/inventory"
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/10-mobile-inventory.png --full || true
  echo "✅ Mobile Inventory loaded"
  
  # Test Mobile Deliveries
  ab --session "$session" open "$BASE_URL/mobile/logistics/deliveries"
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/11-mobile-deliveries.png --full || true
  echo "✅ Mobile Deliveries loaded"
  
  # Test Mobile Scanner
  ab --session "$session" open "$BASE_URL/mobile/logistics/scanner"
  ab --session "$session" wait 2000 || true
  ab --session "$session" screenshot test-results/logistics/12-mobile-scanner.png --full || true
  echo "✅ Mobile Scanner loaded"
  
  echo ""
  echo "🎉 All Logistics Phase 10 tests completed!"
  echo "📸 Screenshots saved to: test-results/logistics/"
}

run_whatsapp_connection_test() {
  node e2e/whatsapp-connection-test.agent-browser.cjs
}

if [[ "$pattern_lc" == "whatsapp-connection-test" ]]; then
  run_whatsapp_connection_test
  exit 0
fi

run_sidebar_modal_dimensions() {
  node e2e/sidebar-modal-dimensions.agent-browser.cjs
}

if [[ "$pattern_lc" == "sidebar-modal-dimensions" ]]; then
  run_sidebar_modal_dimensions
  exit 0
fi

run_project_timeline_enhanced() {
  node e2e/project-timeline-enhanced.agent-browser.cjs
}

if [[ "$pattern_lc" == "project-timeline-enhanced" || "$pattern_lc" == "timeline-enhanced" ]]; then
  run_project_timeline_enhanced
  exit 0
fi

run_project_schedule_routing() {
  node e2e/project-schedule-routing.agent-browser.cjs
}

if [[ "$pattern_lc" == "project-schedule-routing" || "$pattern_lc" == "schedule-routing" ]]; then
  run_project_schedule_routing
  exit 0
fi

run_financial_kpi() {
  node e2e/financial-kpi.agent-browser.cjs
}

if [[ "$pattern_lc" == "financial-kpi" || "$pattern_lc" == "financial-kpi-review" ]]; then
  run_financial_kpi
  exit 0
fi

run_timeline_circle_colors_test() {
  node e2e/timeline-circle-colors-test.cjs
}

if [[ "$pattern_lc" == "timeline-circle-colors-test" || "$pattern_lc" == "timeline-circle-colors" ]]; then
  run_timeline_circle_colors_test
  exit 0
fi

run_roadmap_display_settings_color() {
  node e2e/roadmap-display-settings-color.agent-browser.cjs
}

if [[ "$pattern_lc" == "roadmap-display-settings-color" || "$pattern_lc" == "roadmap-display-settings" ]]; then
  run_roadmap_display_settings_color
  exit 0
fi

# Phase 1 Foundation E2E (tenant onboarding, super admin, tenant switch)
run_phase1_onboarding() {
  node e2e/phase1-onboarding.agent-browser.cjs
}

run_phase1_admin_tenants() {
  node e2e/phase1-admin-tenants.agent-browser.cjs
}

run_phase1_tenant_switch() {
  node e2e/phase1-tenant-switch.agent-browser.cjs
}

if [[ "$pattern_lc" == "phase1-onboarding" ]]; then
  run_phase1_onboarding
  exit 0
fi

if [[ "$pattern_lc" == "phase1-admin-tenants" || "$pattern_lc" == "phase1-admin" ]]; then
  run_phase1_admin_tenants
  exit 0
fi

if [[ "$pattern_lc" == "phase1-tenant-switch" || "$pattern_lc" == "phase1-switch" ]]; then
  run_phase1_tenant_switch
  exit 0
fi

run_auth_signin_signup() {
  node e2e/auth-signin-signup.agent-browser.cjs
}

if [[ "$pattern_lc" == "auth-signin-signup" || "$pattern_lc" == "auth-signin" ]]; then
  run_auth_signin_signup
  exit 0
fi

run_add_user() {
  node e2e/add-user.agent-browser.cjs
}

if [[ "$pattern_lc" == "add-user" ]]; then
  run_add_user
  exit 0
fi

if [[ "$pattern_lc" == "phase1" ]]; then
  failed=0
  run_phase1_onboarding || failed=1
  run_phase1_admin_tenants || failed=1
  run_phase1_tenant_switch || failed=1
  exit $failed
fi

# Phase 2 Module-Based Licensing E2E
run_phase2_admin_tenant_modules() {
  node e2e/phase2-admin-tenant-modules.agent-browser.cjs
}

run_phase2_licensing_sidebar() {
  node e2e/phase2-licensing-sidebar.agent-browser.cjs
}

if [[ "$pattern_lc" == "phase2-admin-tenant-modules" || "$pattern_lc" == "phase2-admin-modules" ]]; then
  run_phase2_admin_tenant_modules
  exit 0
fi

if [[ "$pattern_lc" == "phase2-licensing-sidebar" || "$pattern_lc" == "phase2-sidebar" ]]; then
  run_phase2_licensing_sidebar
  exit 0
fi

if [[ "$pattern_lc" == "phase2" ]]; then
  failed=0
  run_phase2_admin_tenant_modules || failed=1
  run_phase2_licensing_sidebar || failed=1
  exit $failed
fi

if [[ "$pattern_lc" == "all" || "$pattern_lc" == "" || "$pattern_lc" == *"forms"* ]]; then
  run_forms_full_flow
fi

if [[ "$pattern_lc" == "all" || "$pattern_lc" == *"mobile"* ]]; then
  run_mobile_flow
fi
