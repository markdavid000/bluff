export interface ChipAddresses {
  chips: string;
  dollars: string;
}

export const CHIP_ADDRESSES: Readonly<Record<string, ChipAddresses>> = {
  sepolia: {
    chips: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    dollars: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
  },
};
