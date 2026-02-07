from bs4 import BeautifulSoup
import json

# Load the HTML content
with open('genrelist.html', 'r', encoding='utf-8') as file:
    html_content = file.read()

# Parse the HTML content using BeautifulSoup
soup = BeautifulSoup(html_content, 'html.parser')

# Function to extract genres and subgenres
def extract_genres(soup):
    genres_dict = {}
    genres_list = soup.find_all('ul', class_='ul-inside expandible')
    
    for genre_ul in genres_list:
        parent_genre = genre_ul.find_previous_sibling('li', class_='genre-term-basic').text.strip()
        subgenres = []
        
        for subgenre_li in genre_ul.find_all('li', class_='capital-letter genre-term'):
            subgenre = subgenre_li.find('a').text.strip()
            subgenres.append(subgenre)
        
        genres_dict[parent_genre] = subgenres
    
    return genres_dict

# Extract genres and subgenres
genres_dict = extract_genres(soup)

# Save the relationships to a JSON file
with open('genres_list.json', 'w', encoding='utf-8') as json_file:
    json.dump(genres_dict, json_file, ensure_ascii=False, indent=4)

print("Genres and subgenres have been extracted and saved successfully.")
