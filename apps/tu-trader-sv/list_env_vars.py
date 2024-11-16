import dotenv
print("\n")
print(" ".join(f'{k}="{v}"' for k, v in dotenv.dotenv_values(".env").items()))
