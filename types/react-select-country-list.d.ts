declare module "react-select-country-list" {
  type Country = {
    label: string
    value: string
  }

  interface CountryList {
    getData(): Country[]
  }

  export default function useCountryList(): CountryList
}