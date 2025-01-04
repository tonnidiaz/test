interface ImportMeta {
    url: string,
    env: {
      MODE: string;
      BASE_URL: string;
      [key: string]: string; // Add other properties dynamically if needed
    };
  }