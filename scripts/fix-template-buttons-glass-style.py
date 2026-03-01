#!/usr/bin/env python3
"""
Fix all template page header buttons to use glass-style.
"""

import re

# Template detail and edit pages
TEMPLATE_PAGES = [
    "src/pages/PhaseTemplateDetail.tsx",
    "src/pages/PhaseTemplateEdit.tsx",
    "src/pages/BudgetTemplateDetail.tsx",
    "src/pages/BudgetTemplateEdit.tsx",
    "src/pages/ActivityTemplateDetail.tsx",
    "src/pages/ActivityTemplateEdit.tsx",
]


def update_buttons_to_glass_style(filepath):
    """Update button styles in a file to glass-style."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content

        # Pattern 1: Update outline buttons without className
        content = re.sub(
            r'<Button\s+variant="outline"\s+size="sm"\s+onClick',
            '<Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold whitespace-nowrap" onClick',
            content,
        )

        # Pattern 2: Update default variant buttons
        content = re.sub(
            r'<Button\s+variant="default"\s+size="sm"\s+onClick',
            '<Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold whitespace-nowrap" onClick',
            content,
        )

        # Pattern 3: Update buttons with size="sm" and no variant
        content = re.sub(
            r'<Button\s+size="sm"\s+onClick',
            '<Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold whitespace-nowrap" onClick',
            content,
        )

        # Pattern 4: Update destructive buttons (special red glass style)
        # Find multi-line destructive buttons
        content = re.sub(
            r'<Button\s*\n\s*variant="destructive"\s*\n\s*size="sm"',
            '<Button variant="destructive" size="sm" className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold whitespace-nowrap"',
            content,
        )

        # Single-line destructive
        content = re.sub(
            r'<Button\s+variant="destructive"\s+size="sm"\s+onClick',
            '<Button variant="destructive" size="sm" className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold whitespace-nowrap" onClick',
            content,
        )

        # Pattern 5: Update buttons with disabled prop
        content = re.sub(
            r'<Button\s+variant="outline"\s+size="sm"\s+className="bg-white/10[^"]*"\s+onClick={[^}]+}\s+disabled',
            lambda m: m.group(0)
            .replace("onClick={", "onClick={")
            .replace(" disabled", " disabled"),
            content,
        )

        if content != original_content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ Updated: {filepath}")
            return True
        else:
            print(f"ℹ️  No changes: {filepath}")
            return False

    except Exception as e:
        print(f"❌ Error: {filepath} - {e}")
        return False


def main():
    print("🎨 Updating template page buttons to glass-style...\n")

    updated = 0
    for filepath in TEMPLATE_PAGES:
        if update_buttons_to_glass_style(filepath):
            updated += 1

    print(f"\n✨ Updated {updated}/{len(TEMPLATE_PAGES)} files")


if __name__ == "__main__":
    main()
