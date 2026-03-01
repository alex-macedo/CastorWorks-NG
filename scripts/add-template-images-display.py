#!/usr/bin/env python3
"""
Script to add template image display section to all template detail pages.
"""

import re

# Template image display code to insert
IMAGE_DISPLAY_CODE = """
        {/* Template Image */}
        {template.image_url && (
          <Card>
            <CardContent className="p-0">
              <img
                src={template.image_url}
                alt={displayName || template.template_name || template.name || "Template"}
                className="w-full h-64 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}
"""

# Files to update with (line_marker, description)
FILES_TO_UPDATE = [
    {
        "path": "src/pages/PhaseTemplateDetail.tsx",
        "marker": "        {/* Summary Cards */",
        "alt_field": "displayName",
    },
    {
        "path": "src/pages/BudgetTemplateDetail.tsx",
        "marker": "        {/* Summary Cards */",
        "alt_field": "displayName",
    },
    {
        "path": "src/pages/ActivityTemplateDetail.tsx",
        "marker": "        {/* Summary Cards */",
        "alt_field": "displayName",
    },
]


def add_image_display(file_path, marker, alt_field):
    """Add image display section before the marker."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if image display already exists
        if "{/* Template Image */}" in content:
            print(f"  ℹ️  Image display already exists in {file_path}")
            return False

        # Find the marker and insert before it
        if marker not in content:
            print(f"  ❌ Marker not found in {file_path}: {marker}")
            return False

        # Customize the image display code for this file
        custom_code = IMAGE_DISPLAY_CODE.replace(
            "displayName || template.template_name || template.name", alt_field
        )

        # Insert before the marker
        new_content = content.replace(marker, custom_code + "\n" + marker)

        # Write back
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(f"  ✅ Added image display to {file_path}")
        return True

    except Exception as e:
        print(f"  ❌ Error processing {file_path}: {e}")
        return False


def main():
    print("🖼️  Adding template image display to all template detail pages...\n")

    updated_count = 0
    for file_info in FILES_TO_UPDATE:
        if add_image_display(
            file_info["path"], file_info["marker"], file_info["alt_field"]
        ):
            updated_count += 1

    print(f"\n✨ Updated {updated_count}/{len(FILES_TO_UPDATE)} files")


if __name__ == "__main__":
    main()
