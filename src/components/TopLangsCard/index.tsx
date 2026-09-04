import { LanguageUnit } from '@/types/enums';
import { LanguageStat } from '@/types/stats';
import {
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React from 'react';

export interface TopLangsCardProps {
  languages: LanguageStat[];
  languageUnit: LanguageUnit;
}

export default function TopLangsCard({
  languages,
  languageUnit,
}: TopLangsCardProps) {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const trackColor = useColorModeValue('gray.100', 'whiteAlpha.200');

  const total = languages.reduce((sum, language) => sum + language.value, 0);

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      p={4}
      mt={4}
      data-testid="top-langs-card"
    >
      <Heading as="h4" size="sm" color="#4299E1" mb={3}>
        Most Used Languages
      </Heading>

      {total === 0 ? (
        <Text fontSize="sm" color={labelColor}>
          No language data available for this user.
        </Text>
      ) : (
        <>
          <Flex
            h="10px"
            borderRadius="full"
            overflow="hidden"
            bg={trackColor}
            mb={3}
          >
            {languages.map((language) => (
              <Box
                key={language.name}
                bg={language.color}
                w={`${(language.value / total) * 100}%`}
                data-testid={`lang-bar-${language.name}`}
              />
            ))}
          </Flex>

          <SimpleGrid columns={2} spacingX={6} spacingY={1}>
            {languages.map((language) => (
              <Flex key={language.name} align="center" gap={2}>
                <Box
                  w="10px"
                  h="10px"
                  borderRadius="full"
                  bg={language.color}
                  flexShrink={0}
                />
                <Text fontSize="sm" isTruncated>
                  {language.name}
                </Text>
                <Text fontSize="sm" color={labelColor} ml="auto">
                  {((language.value / total) * 100).toFixed(1)}%
                </Text>
              </Flex>
            ))}
          </SimpleGrid>

          {languageUnit === LanguageUnit.REPOS && (
            <Text fontSize="xs" color={labelColor} mt={3}>
              Share of repositories by primary language. A personal access token
              switches this to bytes of code.
            </Text>
          )}
        </>
      )}
    </Box>
  );
}
