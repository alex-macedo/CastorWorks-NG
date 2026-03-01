import json
import os

def fill_empty_values(source_obj, target_obj):
    count = 0
    if isinstance(source_obj, dict) and isinstance(target_obj, dict):
        for key, value in source_obj.items():
            if key not in target_obj:
                target_obj[key] = value
                count += 1
            elif target_obj[key] == "" or target_obj[key] is None:
                target_obj[key] = value
                count += 1
            elif isinstance(value, dict):
                count += fill_empty_values(value, target_obj.get(key, {}))
    return count

def main():
    base_path = "src/locales"
    source_locale = "en-US"
    target_locales = ["pt-BR", "es-ES", "fr-FR"]
    
    source_dir = os.path.join(base_path, source_locale)
    files = [f for f in os.listdir(source_dir) if f.endswith(".json")]
    
    total_updated = 0
    
    for target_locale in target_locales:
        target_dir = os.path.join(base_path, target_locale)
        print(f"Processing {target_locale}...")
        
        for filename in files:
            source_file = os.path.join(source_dir, filename)
            target_file = os.path.join(target_dir, filename)
            
            if not os.path.exists(target_file):
                # If target file doesn't exist, just copy the source
                with open(source_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"  Created {filename}")
                continue
                
            with open(source_file, 'r', encoding='utf-8') as f:
                source_data = json.load(f)
            with open(target_file, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
                
            updated = fill_empty_values(source_data, target_data)
            
            if updated > 0:
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(target_data, f, indent=2, ensure_ascii=False)
                print(f"  Updated {filename}: filled {updated} empty values")
                total_updated += updated
                
    print(f"Finished. Total empty values filled: {total_updated}")

if __name__ == "__main__":
    main()
