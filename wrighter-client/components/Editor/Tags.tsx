import {
  HStack,
  Popover,
  PopoverTrigger,
  IconButton,
  PopoverContent,
  PopoverArrow,
  PopoverHeader,
  Center,
  Input,
  PopoverBody,
  PopoverFooter,
  Button,
  Text,
  Box,
  VStack,
  Spinner,
  Kbd,
} from "@chakra-ui/react";
import debounce from "lodash.debounce";
import { useState, useEffect, ChangeEvent, KeyboardEvent, useMemo, useRef } from "react";
import { FiPlusCircle, FiX, FiCheck } from "react-icons/fi";
import { useQuery } from "react-query";
import { useUserContext } from "../../contexts/UserContext";
import { getTagsForWright, createTag, attachTagToWright, searchTags } from "../../services/tagService";
import { Wright, Tag, TagSearchResult } from "../../types";
import { CustomToolTip } from "../CustomTooltip";

export const Tags = ({ initWright }: { initWright: Wright }): JSX.Element => {
  const [currentEditingTag, setCurrentEditingTag] = useState("");
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [focusedTagIdx, setFocusedTagIdx] = useState<number>(0);
  const { isAuthenticated } = useUserContext();
  const initialFocusRef = useRef<any>();

  useEffect(() => {
    if (initWright?.tags && initWright?.tags?.length > 0) {
      setCurrentTags(initWright.tags);
    }
  }, [initWright]);

  const { refetch: createAndAttachTagRequest, isFetching: isAddingTag } = useQuery(
    "createAndAttachTagQuery",
    () => createAndAttachTagHandler(),
    {
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );

  const { refetch: refetchTagsForWright, isFetching: isFetchingTags } = useQuery(
    "getTagsForWright",
    () => getTagsForWright(!isAuthenticated(), initWright?.id),
    {
      enabled: false,
    }
  );

  const searchTagsHandler = async (): Promise<TagSearchResult[]> => {
    const tags = await searchTags(!isAuthenticated(), currentEditingTag);
    setFocusedTagIdx(currentEditingTag.trim().length === 0 ? 0 : -1);
    if (tags) {
      const modifiedTags: TagSearchResult[] = [];
      for (const tag of tags) {
        if (!currentTags.find((t) => t.id === tag.id)) {
          modifiedTags.push({ ...tag, isTagged: false });
        } else {
          modifiedTags.push({ ...tag, isTagged: true });
        }
      }
      modifiedTags.sort((a, b) => (a?.isTagged ? 1 : -1));
      return modifiedTags;
    }
    return [];
  };

  useEffect(() => {
    searchTagRequest();
  }, []);

  const {
    refetch: searchTagRequest,
    isFetching: isSearchingTags,
    data: searchTagResults,
  } = useQuery("searchTags", () => searchTagsHandler(), {
    enabled: false,
  });

  const debouncedTagsSearch = useMemo(() => debounce(searchTagRequest, isAuthenticated() ? 800 : 300), []);

  const createAndAttachTagHandler = async () => {
    const newTag = await createTag(!isAuthenticated(), { name: currentEditingTag });
    if (newTag && newTag?.id) {
      await attachTagToWright(!isAuthenticated(), newTag.id, initWright.id);
      const { data: updatedTags } = await refetchTagsForWright();
      setCurrentTags(updatedTags || []);
      setCurrentEditingTag("");
      return updatedTags || [];
    }
    return [];
  };

  const handleTagInputChange = async (value: string) => {
    setCurrentEditingTag(value.trim());
    debouncedTagsSearch();
  };

  useEffect(() => {
    if (currentEditingTag.length === 0) {
      setFocusedTagIdx(0);
    }
  }, [currentEditingTag]);

  return (
    <Box px={{ base: "1%", md: "4%" }} mx="20px">
      <HStack spacing={3} role="group">
        <HStack>
          {currentTags && currentTags?.length > 0 ? (
            currentTags?.map((tag) => {
              return <Text key={tag.id}>{tag.name}</Text>;
            })
          ) : (
            <Text fontSize="sm" fontWeight="medium" color="textLighter" opacity="0.6" as="i">
              untagged
            </Text>
          )}
        </HStack>
        <Box
          w={0.5}
          h="17px"
          borderRadius="100px"
          bg="textLighter"
          transition="opacity 0.2s ease-in-out"
          opacity={showTagEditor ? 0.1 : 0.04}
          _groupHover={{
            opacity: 0.1,
          }}
        ></Box>
        <HStack
          transition="opacity 0.2s ease-in-out"
          transitionDelay="0.1s"
          opacity={showTagEditor ? 1 : 0.44}
          _groupHover={{
            opacity: 1,
          }}
        >
          <Popover placement="bottom-start" initialFocusRef={initialFocusRef}>
            <PopoverTrigger>
              <Box>
                <CustomToolTip label="add new tag">
                  <IconButton
                    variant="ghost"
                    size="xs"
                    icon={<FiPlusCircle />}
                    aria-label="add tag"
                    onClick={() => {
                      setShowTagEditor(true);
                    }}
                  />
                </CustomToolTip>
              </Box>
            </PopoverTrigger>
            <PopoverContent
              maxW="280px"
              onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  // createAndAttachTagRequest();
                  console.log(focusedTagIdx, searchTagResults);
                }
              }}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (searchTagResults) {
                  const unTaggedTags = searchTagResults.filter((tag) => !tag.isTagged);
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (focusedTagIdx === -1) {
                      setFocusedTagIdx(unTaggedTags.length - 1);
                      return;
                    }
                    if (focusedTagIdx === 0) {
                      if (currentEditingTag.trim().length > 0) {
                        setFocusedTagIdx(-1);
                      } else {
                        setFocusedTagIdx(unTaggedTags?.length - 1);
                      }
                    } else {
                      const idxToMove = (focusedTagIdx - 1) % unTaggedTags?.length;
                      setFocusedTagIdx(isNaN(idxToMove) ? -1 : idxToMove);
                    }
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (focusedTagIdx === unTaggedTags?.length - 1) {
                      if (currentEditingTag.trim().length > 0) {
                        setFocusedTagIdx(-1);
                      } else {
                        setFocusedTagIdx(0);
                      }
                    } else {
                      const idxToMove = (focusedTagIdx + 1) % unTaggedTags?.length;
                      setFocusedTagIdx(isNaN(idxToMove) ? -1 : idxToMove);
                    }
                  }
                }
              }}
            >
              <PopoverArrow />
              <PopoverHeader>
                <HStack spacing={0} bg="bgLight" borderRadius={8}>
                  <Center pl={2} w={4} h={6}>
                    <Text color="textLighter" fontWeight="800" fontSize="md" opacity={0.6}>
                      #
                    </Text>
                  </Center>
                  <Input
                    ref={initialFocusRef}
                    variant="unstyled"
                    placeholder="search or add tag"
                    isDisabled={isAddingTag || isFetchingTags}
                    autoFocus
                    size="md"
                    borderColor="inputBorderColor"
                    borderRadius={8}
                    // width={100}
                    height="32px"
                    px={2}
                    value={currentEditingTag}
                    _focusVisible={{
                      bg: "transparent",
                      border: "none",
                    }}
                    // onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                    //   if (e.key === "Enter") {
                    //     // createAndAttachTagRequest();
                    //     console.log(focusedTagIdx, searchTagResults);
                    //   }
                    // }}
                    // onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    //   if (searchTagResults) {
                    //     const unTaggedTags = searchTagResults.filter((tag) => !tag.isTagged);
                    //     if (e.key === "ArrowUp") {
                    //       e.preventDefault();
                    //       if (focusedTagIdx === -1) {
                    //         setFocusedTagIdx(unTaggedTags.length - 1);
                    //         return;
                    //       }
                    //       if (focusedTagIdx === 0) {
                    //         if (currentEditingTag.trim().length > 0) {
                    //           setFocusedTagIdx(-1);
                    //         } else {
                    //           setFocusedTagIdx(unTaggedTags?.length - 1);
                    //         }
                    //       } else {
                    //         const idxToMove = (focusedTagIdx - 1) % unTaggedTags?.length;
                    //         setFocusedTagIdx(isNaN(idxToMove) ? -1 : idxToMove);
                    //       }
                    //     } else if (e.key === "ArrowDown") {
                    //       e.preventDefault();
                    //       if (focusedTagIdx === unTaggedTags?.length - 1) {
                    //         if (currentEditingTag.trim().length > 0) {
                    //           setFocusedTagIdx(-1);
                    //         } else {
                    //           setFocusedTagIdx(0);
                    //         }
                    //       } else {
                    //         const idxToMove = (focusedTagIdx + 1) % unTaggedTags?.length;
                    //         setFocusedTagIdx(isNaN(idxToMove) ? -1 : idxToMove);
                    //       }
                    //     }
                    //   }
                    // }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleTagInputChange(e.target.value)}
                  />
                </HStack>
              </PopoverHeader>
              <PopoverBody maxH="200px" minH="200px" overflowY="auto">
                {isSearchingTags ? (
                  <Center>
                    <Spinner
                      sx={{
                        "--spinner-size": "1rem",
                        borderBottomColor: "textLighter",
                        borderLeftColor: "textLighter",
                        borderTopColor: "transparent",
                        borderRightColor: "transparent",
                      }}
                    />
                  </Center>
                ) : (
                  <VStack align="flex-start" w="full" spacing={1}>
                    {currentEditingTag.trim() && (
                      <Box
                        cursor="pointer"
                        borderRadius={8}
                        px={1.5}
                        py={1}
                        w="full"
                        bg="successGreenTransBg"
                        color="successGreen"
                        transition="opacity 0.15s ease-in-out"
                        opacity={focusedTagIdx === -1 ? 1 : 0.85}
                        onMouseMoveCapture={() => {
                          setFocusedTagIdx(-1);
                        }}
                      >
                        <HStack justify="space-between">
                          <Text fontWeight="black"># {currentEditingTag}</Text>
                          <Kbd
                            bg="bgLighter"
                            borderColor="successGreen"
                            opacity={focusedTagIdx === -1 ? 1 : 0}
                            transform={focusedTagIdx === -1 ? "translateX(0)" : "translateX(4px)"}
                            transition="all 0.2s ease-in-out"
                          >
                            ↩
                          </Kbd>
                        </HStack>
                      </Box>
                    )}

                    {searchTagResults?.map((tag, idx) => {
                      return (
                        <Box
                          cursor={tag?.isTagged ? "no-drop" : "pointer"}
                          borderRadius={8}
                          px={1.5}
                          py={1}
                          w="full"
                          key={tag.id}
                          bg={idx === focusedTagIdx ? "bgLight" : "bgLighter"}
                          // _hover={{
                          //   bg: "bgLight",
                          // }}
                          transition="background 0.3s ease-in-out"
                          opacity={tag?.isTagged ? 0.3 : 1}
                          onMouseMoveCapture={() => {
                            if (!tag.isTagged) {
                              setFocusedTagIdx(idx);
                            }
                          }}
                        >
                          <HStack justify="space-between">
                            <Text
                              fontWeight={tag?.isTagged ? "bold" : "black"}
                              textDecoration={tag?.isTagged ? "line-through" : "none"}
                            >
                              # {tag.name}
                            </Text>
                            <Kbd
                              bg="bgLighter"
                              transition="all 0.25s ease-in-out"
                              opacity={focusedTagIdx === idx ? 1 : 0}
                              transform={focusedTagIdx === idx ? "translateX(0)" : "translateX(4px)"}
                            >
                              ↩
                            </Kbd>
                          </HStack>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </PopoverBody>
              <PopoverFooter>
                <HStack spacing={3} w="full" justify="flex-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    bg="errorRedTransBg"
                    _hover={{ bg: "errorRedTransBg" }}
                    rightIcon={<FiX />}
                    iconSpacing={1}
                    aria-label="remove tag input"
                    onClick={() => {
                      setShowTagEditor(false);
                    }}
                    opacity="0.9"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    isLoading={isAddingTag || isFetchingTags}
                    size="sm"
                    rightIcon={<FiCheck />}
                    aria-label="add tag confirm"
                    iconSpacing={1}
                    onClick={() => {
                      createAndAttachTagRequest();
                    }}
                    fontWeight="700"
                  >
                    Done
                  </Button>
                </HStack>
              </PopoverFooter>
            </PopoverContent>
          </Popover>
          {/* {showTagEditor && (
            <HStack spacing={1}>
              <Text color="textLighter" fontWeight="800" fontSize="sm" opacity={0.6}>
                #
              </Text>
              <Input
                isDisabled={isAddingTag || isFetchingTags}
                autoFocus
                size="sm"
                borderColor="inputBorderColor"
                borderRadius={10}
                width={100}
                height="24px"
                px={2}
                value={currentEditingTag}
                onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    createAndAttachTagRequest();
                  }
                }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentEditingTag(e.target.value.trim())}
              />
              <IconButton
                variant="ghost"
                isLoading={isAddingTag || isFetchingTags}
                size="xs"
                icon={<FiCheck />}
                aria-label="add tag confirm"
                onClick={() => {
                  createAndAttachTagRequest();
                }}
              />
              <IconButton
                variant="ghost"
                size="xs"
                bg="errorRedTransBg"
                _hover={{ bg: "errorRedTransBg" }}
                icon={<FiX />}
                aria-label="remove tag input"
                onClick={() => {
                  setShowTagEditor(false);
                }}
              />
            </HStack>
          )} */}
        </HStack>
      </HStack>
    </Box>
  );
};