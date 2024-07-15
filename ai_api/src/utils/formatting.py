def create_input_text(option):
    website=option["Website"]
    if option["Local / National"]=="National":
        location=option["Local / National"]
    else:
        location=option["Postcode"]
    description=option["Short text description"]
    name=option["Name"]
    result={"website": website, "location": location, "description": description, "name": name}
    return result

